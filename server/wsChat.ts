import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { matches } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";

interface AuthedSocket extends WebSocket {
  userId?: string;
  matchIds?: Set<number>;
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
}

function broadcastToRoom(matchId: number, payload: object, excludeWs?: AuthedSocket) {
  const data = JSON.stringify(payload);
  rooms.get(matchId)?.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

export function setupChatWebSocket(httpServer: Server, sessionMiddleware: any) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/chat" });

  wss.on("connection", (ws: AuthedSocket, req: IncomingMessage) => {
    // Authenticate via session cookie
    const fakeRes = {
      getHeader: () => {},
      setHeader: () => {},
      end: () => {},
    } as any;

    sessionMiddleware(req as any, fakeRes, async () => {
      const session = (req as any).session;
      const userId: string | undefined = session?.passport?.user;

      if (!userId) {
        ws.close(4001, "Unauthorized");
        return;
      }

      ws.userId = userId;

      ws.on("message", async (raw) => {
        let msg: any;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }

        // ── JOIN ──────────────────────────────────────────────────
        if (msg.type === "join" && typeof msg.matchId === "number") {
          const matchId: number = msg.matchId;
          // Verify user belongs to this match
          const [match] = await db
            .select()
            .from(matches)
            .where(
              and(
                eq(matches.id, matchId),
                or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))
              )
            );
          if (!match) {
            ws.send(JSON.stringify({ type: "error", message: "Not authorized for this match" }));
            return;
          }
          joinRoom(matchId, ws);
          ws.send(JSON.stringify({ type: "joined", matchId }));
        }

        // ── TYPING ────────────────────────────────────────────────
        if (msg.type === "typing" && typeof msg.matchId === "number") {
          broadcastToRoom(msg.matchId, { type: "typing", matchId: msg.matchId, userId }, ws);
        }

        // ── READ ──────────────────────────────────────────────────
        if (msg.type === "read" && typeof msg.matchId === "number") {
          await storage.markMessagesAsRead(msg.matchId, userId);
          broadcastToRoom(msg.matchId, { type: "read", matchId: msg.matchId, userId }, ws);
        }
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
    },
  };
}
