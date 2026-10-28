import { and, eq, or } from "drizzle-orm";
import { db } from "./db";
import { matches } from "@shared/schema";

export async function getAcceptedStoryConnections(viewerId: string): Promise<Set<string>> {
  const rows = await db.select({ user1Id: matches.user1Id, user2Id: matches.user2Id })
    .from(matches).where(and(
      eq(matches.status, "matched"),
      or(eq(matches.user1Id, viewerId), eq(matches.user2Id, viewerId)),
    ));
  return new Set(rows.map(row => row.user1Id === viewerId ? row.user2Id : row.user1Id));
}