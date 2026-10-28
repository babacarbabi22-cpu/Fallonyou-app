import { and, desc, eq, lt } from "drizzle-orm";
import { messages } from "@shared/schema";
import { db } from "./db";

export function parseMessageCursor(value: unknown): number | undefined {
  if (value === undefined) return;
  if (typeof value !== "string" || !/^\d{1,10}$/.test(value)) throw new Error("Invalid message cursor");
  const cursor = Number(value);
  if (!Number.isSafeInteger(cursor) || cursor < 1 || cursor > 2_147_483_647) throw new Error("Invalid message cursor");
  return cursor;
}

export async function messagePage(matchId: number, before?: number, database = db) {
  const rows = await database.select().from(messages)
    .where(and(eq(messages.matchId, matchId), before ? lt(messages.id, before) : undefined))
    .orderBy(desc(messages.id)).limit(51);
  const items = rows.slice(0, 50);
  const nextCursor = rows.length > 50 ? String(items[items.length - 1].id) : undefined;
  return { items: items.reverse(), nextCursor };
}
