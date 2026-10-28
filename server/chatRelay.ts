import { randomUUID } from "node:crypto";
import pg from "pg";
import { pool } from "./db";

const CHANNEL = "fallonyou_chat_events";
export type ChatRelayEvent = {
  origin: string;
  matchId: number;
  type: "message" | "typing" | "read";
  messageId?: number;
  userId?: string;
};

export function parseChatRelayEvent(raw: string): ChatRelayEvent | undefined {
  if (Buffer.byteLength(raw) > 1024) return;
  let event: ChatRelayEvent;
  try { event = JSON.parse(raw); } catch { return; }
  if (!event || typeof event !== "object" || typeof event.origin !== "string" || event.origin.length > 128 ||
      !Number.isSafeInteger(event.matchId) || event.matchId < 1) return;
  if (event.type === "message") {
    if (!Number.isSafeInteger(event.messageId) || event.messageId! < 1) return;
    return { origin: event.origin, matchId: event.matchId, type: event.type, messageId: event.messageId };
  }
  if (!["typing", "read"].includes(event.type) || typeof event.userId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(event.userId)) return;
  return { origin: event.origin, matchId: event.matchId, type: event.type, userId: event.userId };
}

// Only identifiers cross PostgreSQL NOTIFY. Message text/media stays in its
// existing storage and is fetched only on an instance with room subscribers.
export function createChatRelay(onEvent: (event: ChatRelayEvent) => Promise<void>) {
  const origin = randomUUID();
  let client: pg.Client | undefined;
  let stopped = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryDelay = 1000;
  const reconnect = () => {
    if (stopped || retryTimer) return;
    retryTimer = setTimeout(() => { retryTimer = undefined; void connect(); }, retryDelay);
    retryTimer.unref();
    retryDelay = Math.min(retryDelay * 2, 30_000);
  };
  const connect = async () => {
    if (stopped) return;
    const next = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
    client = next;
    next.on("error", () => {
      if (client !== next) return;
      console.error("[Chat relay] Subscription interrupted; reconnecting");
      void next.end().catch(() => {});
      reconnect();
    });
    next.on("end", () => { if (client === next) reconnect(); });
    next.on("notification", notification => {
      if (!notification.payload || notification.channel !== CHANNEL) return;
      const event = parseChatRelayEvent(notification.payload);
      if (event && event.origin !== origin) {
        void onEvent(event).catch(() => console.error("[Chat relay] Event delivery failed"));
      }
    });
    try {
      await next.connect();
      await next.query(`LISTEN ${CHANNEL}`);
      retryDelay = 1000;
      console.log("[Chat relay] Cross-instance subscription ready");
    } catch {
      console.error("[Chat relay] Subscription unavailable; retrying");
      void next.end().catch(() => {});
      reconnect();
    }
  };
  return {
    start: connect,
    async publish(event: Omit<ChatRelayEvent, "origin">) {
      const payload = JSON.stringify({ ...event, origin });
      const safe = parseChatRelayEvent(payload);
      if (!safe) throw new Error("Invalid chat relay event");
      await pool.query("SELECT pg_notify($1, $2)", [CHANNEL, JSON.stringify(safe)]);
    },
    async stop() {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      await client?.end().catch(() => {});
    },
  };
}
