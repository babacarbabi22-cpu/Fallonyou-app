import { and, eq, gt, ne, or, sql } from "drizzle-orm";
import { db } from "./db";
import { users, profiles } from "@shared/schema";
import { publicAgeColumn, publicUserColumns } from "./publicUser";

export function parseMemberPage(query: Record<string, unknown>) {
  const rawLimit = query.limit ?? "24";
  if (typeof rawLimit !== "string" || !/^\d{1,3}$/.test(rawLimit)) throw new Error("Invalid limit");
  const limit = Number(rawLimit);
  if (limit < 1 || limit > 50) throw new Error("Invalid limit");
  const cursor = query.cursor;
  if (cursor !== undefined && (typeof cursor !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(cursor))) {
    throw new Error("Invalid cursor");
  }
  return { limit, cursor: cursor as string | undefined };
}

export type MemberPage = ReturnType<typeof parseMemberPage>;

function eligibility(viewerId: string, page: MemberPage, discovery: boolean, showMe: string) {
  return and(
    ne(users.id, viewerId), eq(users.isBanned, "false"),
    page.cursor ? gt(users.id, page.cursor) : undefined,
    sql`(${users.profileImageUrl} IS NOT NULL OR EXISTS (SELECT 1 FROM photos p WHERE p.user_id = ${users.id}))`,
    sql`NOT EXISTS (SELECT 1 FROM blocked_users b WHERE
      (b.user_id = ${viewerId} AND b.blocked_user_id = ${users.id}) OR
      (b.blocked_user_id = ${viewerId} AND b.user_id = ${users.id}))`,
    discovery ? sql`${users.createdAt} < ${new Date(Date.now() - 86_400_000)}` : undefined,
    discovery ? sql`NOT EXISTS (SELECT 1 FROM matches m WHERE m.user1_id = ${viewerId} AND m.user2_id = ${users.id})` : undefined,
    discovery && showMe === "men" ? eq(profiles.gender, "male") : undefined,
    discovery && showMe === "women" ? eq(profiles.gender, "female") : undefined,
  );
}

function finishPage<T extends { id: string }>(rows: T[], page: MemberPage) {
  const items = rows.slice(0, page.limit);
  return { items, nextCursor: rows.length > page.limit ? items[items.length - 1].id : undefined };
}

export async function discoveryMemberPage(viewerId: string, page: MemberPage, showMe: string, database = db) {
  const rows = await database.select(publicUserColumns).from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eligibility(viewerId, page, true, showMe))
    .orderBy(users.id).limit(page.limit + 1);
  return finishPage(rows, page);
}

export async function directoryMemberPage(viewerId: string, page: MemberPage, database = db) {
  const rows = await database.select({
    id: users.id, firstName: users.firstName, age: publicAgeColumn,
    currentCity: profiles.currentCity, nextAdventure: profiles.nextAdventure,
    favoriteDestinations: profiles.favoriteDestinations,
    notRecommendedDestinations: profiles.notRecommendedDestinations,
    photoUrl: sql<string>`COALESCE(
      (SELECT p.url FROM photos p WHERE p.user_id = ${users.id} AND p.url IS NOT NULL ORDER BY p.id LIMIT 1),
      ${users.profileImageUrl})`,
  }).from(users).leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eligibility(viewerId, page, false, "everyone"))
    .orderBy(users.id).limit(page.limit + 1);
  return finishPage(rows, page);
}
