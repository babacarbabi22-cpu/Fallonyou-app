import { WebSocketServer, WebSocket, type RawData } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { matches, users, messages } from "@shared/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { isStoredSessionValid } from "./emailAuth";
import { isActiveChatMember, isAllowedBrowserOrigin, isSafeMutationPayload, WebSocketMessageLimiter } from "./security";
import { broadcastAuthorized } from "./chatBroadcast";
import { createChatRelay } from "./chatRelay";
import { userHasProfilePhoto } from "./profilePhotoAccess";

interface AuthedSocket extends WebSocket {
  userId?: string;
  sessionId?: string;
  matchIds?: Set<number>;
  alive?: boolean;
}

// matchId → set of connected sockets in that chat room
const rooms = new Map<number, Set<AuthedSocket>>();

function joinRoom(matchId: number, ws: AuthedSocket) {
  if (!rooms.has(matchId)) rooms.set(matchId, new Set());
  rooms.get(matchId)!.add(ws);
  if (!ws.matchIds) ws.matchIds = new Set();
  ws.matchIds.add(matchId);
}

function leaveAllRooms(ws: AuthedSocket) {
  ws.matchIds?.forEach((matchId) => {
    rooms.get(matchId)?.delete(ws);
    if (rooms.get(matchId)?.size === 0) rooms.delete(matchId);
  });
  ws.matchIds?.clear();
}

function leaveRoom(matchId: number, ws: AuthedSocket) {
  rooms.get(matchId)?.delete(ws);
  if (rooms.get(matchId)?.size === 0) rooms.delete(matchId);
  ws.matchIds?.delete(matchId);
}

async function isSocketAuthorizedForMatch(ws: AuthedSocket, matchId: number): Promise<boolean> {
  const userId = ws.userId;
  const sessionId = ws.sessionId;
  if (!userId || !sessionId || !(await isStoredSessionValid(sessionId, userId))) return false;
  if (!(await userHasProfilePhoto(userId))) return false;

  const [match] = await db
    .select({ id: matches.id, user1Id: matches.user1Id, user2Id: matches.user2Id, status: matches.status })
    .from(matches)
    .innerJoin(users, eq(users.id, userId))
    .where(and(
      eq(matches.id, matchId),
      eq(matches.status, "matched"),
      eq(users.isBanned, "false"),
      or(eq(matches.user1Id, userId), eq(matches.user2Id, userId)),
      sql`NOT EXISTS (SELECT 1 FROM blocked_users b WHERE
        (b.user_id = ${matches.user1Id} AND b.blocked_user_id = ${matches.user2Id}) OR
        (b.user_id = ${matches.user2Id} AND b.blocked_user_id = ${matches.user1Id}))`,
    ));
  return isActiveChatMember(userId, match, false);
}

function broadcastToRoom(matchId: number, payload: object, excludeWs?: AuthedSocket) {
  const recipients = rooms.get(matchId);
  if (!recipients) return;
  void broadcastAuthorized(
    Array.from(recipients),
    excludeWs,
    payload,
    WebSocket.OPEN,
    (client) => isSocketAuthorizedForMatch(client, matchId),
    (client, code, reason) => {
      leaveAllRooms(client);
      client.close(code, reason);
    },
  ).catch(() => {
    // broadcastAuthorized is failure-contained; retain a final guard against an
    // unexpected helper rejection so route notifications cannot become unhandled.
  });
}

export function setupChatWebSocket(httpServer: Server, sessionMiddleware: any) {
  const relay = createChatRelay(async event => {
    if (!rooms.get(event.matchId)?.size) return;
    if (event.type === "message") {
      const [message] = await db.select().from(messages).where(and(eq(messages.id, event.messageId!), eq(messages.matchId, event.matchId))).limit(1);
      if (message) broadcastToRoom(event.matchId, { type: "message", matchId: event.matchId, message });
    } else {
      broadcastToRoom(event.matchId, { type: event.type, matchId: event.matchId, userId: event.userId });
    }
  });
  void relay.start();
  const publish = (event: Parameters<typeof relay.publish>[0]) => {
    void relay.publish(event).catch(() => console.error("[Chat relay] Publish failed; saved messages remain available through HTTP"));
  };
  const wss = new WebSocketServer({
    noServer: true,
    path: "/ws/chat",
    maxPayload: 8 * 1024,
    verifyClient: ({ req }, callback) => callback(isAllowedBrowserOrigin(req.headers)),
  });
  const heartbeat = setInterval(() => {
    for (const client of wss.clients as Set<AuthedSocket>) {
      if (client.alive === false) { leaveAllRooms(client); client.terminate(); continue; }
      client.alive = false;
      client.ping();
    }
  }, 30_000);
  heartbeat.unref();
  httpServer.once("close", () => {
    clearInterval(heartbeat);
    for (const client of wss.clients) client.terminate();
    void relay.stop();
    wss.close();
  });

  // Handle only chat upgrades. A server-bound ws instance rejects other paths,
  // which would intercept Vite's development hot-reload connection.
  httpServer.on("upgrade", (req, socket, head) => {
    let path: string;
    try {
      path = new URL(req.url || "/", "https://websocket.invalid").pathname;
    } catch {
      return;
    }
    if (path !== "/ws/chat") return;
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  wss.on("connection", (ws: AuthedSocket, req: IncomingMessage) => {
    ws.alive = true;
    ws.on("pong", () => { ws.alive = true; });
    const authTimeout = setTimeout(() => ws.terminate(), 10_000);
    authTimeout.unref();
    ws.once("close", () => clearTimeout(authTimeout));
    // Authenticate via session cookie
    const fakeRes = {
      getHeader: () => {},
      setHeader: () => {},
      end: () => {},
    } as any;

    sessionMiddleware(req as any, fakeRes, async () => {
      const session = (req as any).session;
      const userId: string | undefined = session?.userId;
      const sessionId: string | undefined = (req as any).sessionID;

      if (!userId || !sessionId || !(await isStoredSessionValid(sessionId, userId))) {
        ws.close(4001, "Unauthorized");
        return;
      }

      ws.userId = userId;
      ws.sessionId = sessionId;
      clearTimeout(authTimeout);
      if (Array.from(wss.clients).filter(client => (client as AuthedSocket).userId === userId).length > 8) {
        ws.close(1008, "Too many connections");
        return;
      }
      const messageLimiter = new WebSocketMessageLimiter();
      let pendingWork = 0;
      let work = Promise.resolve();
      let lastTyping = 0;

      const handleMessage = async (raw: RawData) => {
        try {
          let msg: any;
          try {
            msg = JSON.parse(raw.toString());
          } catch {
            return;
          }

          if (!["join", "typing", "read"].includes(msg?.type) ||
              !Number.isSafeInteger(msg.matchId) || msg.matchId <= 0) return;
          if (msg.type === "typing" && Date.now() - lastTyping < 1000) return;
          if (msg.type === "typing") lastTyping = Date.now();

          const matchId: number = msg.matchId;
          if (!await isSocketAuthorizedForMatch(ws, matchId)) {
            leaveRoom(matchId, ws);
            ws.send(JSON.stringify({ type: "error", message: "Not authorized for this match" }));
            return;
          }

          // ── JOIN ──────────────────────────────────────────────────
          if (msg.type === "join") {
            if ((ws.matchIds?.size ?? 0) >= 20 && !ws.matchIds?.has(matchId)) return;
            joinRoom(matchId, ws);
            ws.send(JSON.stringify({ type: "joined", matchId }));
          }

          // ── TYPING ────────────────────────────────────────────────
          if (msg.type === "typing") {
            if (!ws.matchIds?.has(matchId)) return;
            broadcastToRoom(matchId, { type: "typing", matchId, userId }, ws);
            publish({ type: "typing", matchId, userId });
          }

          // ── READ ──────────────────────────────────────────────────
          if (msg.type === "read") {
            if (!ws.matchIds?.has(matchId)) return;
            await storage.markMessagesAsRead(matchId, userId);
            broadcastToRoom(matchId, { type: "read", matchId, userId }, ws);
            publish({ type: "read", matchId, userId });
          }
        } catch {
          leaveAllRooms(ws);
          ws.close(1011, "Chat unavailable");
        }
      };
      ws.on("message", raw => {
        if (!messageLimiter.allow() || !isSafeMutationPayload(raw as Buffer)) {
          leaveAllRooms(ws);
          ws.close(1008, "Rate limit exceeded");
          return;
        }
        if (pendingWork >= 8) {
          leaveAllRooms(ws);
          ws.close(1013, "Chat busy; reconnect");
          return;
        }
        pendingWork++;
        work = work.then(async () => {
          if (ws.readyState === WebSocket.OPEN) await handleMessage(raw);
        }).finally(() => { pendingWork--; });
      });

      ws.on("close", () => {
        leaveAllRooms(ws);
      });

      ws.on("error", () => {
        leaveAllRooms(ws);
      });
    });
  });

  return {
    // Called by the POST /messages route after saving a message to DB
    notifyNewMessage(matchId: number, message: object) {
      broadcastToRoom(matchId, { type: "message", matchId, message });
      const messageId = (message as { id?: number }).id;
      if (Number.isSafeInteger(messageId)) publish({ type: "message", matchId, messageId });
    },
  };
}
