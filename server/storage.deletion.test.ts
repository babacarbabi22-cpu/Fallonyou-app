import assert from "node:assert/strict";
import test from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import { getTableColumns } from "drizzle-orm";
import {
  ambassadorApplications,
  appSessions,
  adventurePhotos,
  blockedUsers,
  cityTipVotes,
  cityTips,
  eventComments,
  eventParticipants,
  eventRatings,
  events,
  matches,
  messages,
  notifications,
  photos,
  preferences,
  profiles,
  profileViews,
  promptResponses,
  pushSubscriptions,
  ratings,
  referrals,
  reports,
  sessions,
  stories,
  superLikes,
  swipes,
  users,
  uploadedMedia,
  mediaDeletionJobs,
} from "@shared/schema";
import { DatabaseStorage } from "./storage";

const dialect = new PgDialect();
const tableNames = new Map<any, string>([
  [ambassadorApplications, "ambassador_applications"],
  [adventurePhotos, "adventure_photos"],
  [appSessions, "app_sessions"],
  [blockedUsers, "blocked_users"],
  [cityTipVotes, "city_tip_votes"],
  [cityTips, "city_tips"],
  [eventComments, "event_comments"],
  [eventParticipants, "event_participants"],
  [eventRatings, "event_ratings"],
  [events, "events"],
  [matches, "matches"],
  [messages, "messages"],
  [notifications, "notifications"],
  [photos, "photos"],
  [preferences, "preferences"],
  [profiles, "profiles"],
  [profileViews, "profile_views"],
  [promptResponses, "prompt_responses"],
  [pushSubscriptions, "push_subscriptions"],
  [ratings, "ratings"],
  [referrals, "referrals"],
  [reports, "reports"],
  [stories, "stories"],
  [sessions, "sessions"],
  [superLikes, "super_likes"],
  [swipes, "swipes"],
  [users, "users"],
  [uploadedMedia, "uploaded_media"],
  [mediaDeletionJobs, "media_deletion_jobs"],
]);

function mockDeletionDb(selectedIds: Record<string, Array<Record<string, unknown>>>, failDeleteTable?: string) {
  const operations: Array<{ action: string; table: string; sql?: string }> = [];
  let transactionCount = 0;
  const adapter: any = {
    execute: async (query: any) => {
      operations.push({ action: "lock", table: "users", sql: dialect.sqlToQuery(query).sql });
      return { rows: [] };
    },
    insert: (table: any) => ({
      values: (values: any[]) => ({
        onConflictDoNothing: async () => {
          operations.push({ action: "insert", table: tableNames.get(table)!, sql: JSON.stringify(values) });
        },
      }),
    }),
    select: (fields?: Record<string, unknown>) => ({
      from: (table: any) => ({
        where: async (condition: any) => {
          operations.push({ action: "select", table: tableNames.get(table), sql: dialect.sqlToQuery(condition).sql });
          const rows = selectedIds[tableNames.get(table)!] || [];
          if (!fields) return rows;
          const columns = getTableColumns(table);
          return rows.map(row => Object.fromEntries(Object.entries(fields).map(([alias, column]) => {
            const entry = Object.entries(columns).find(([, value]) => value === column);
            return [alias, entry ? row[entry[0]] : undefined];
          })));
        },
      }),
    }),
    delete: (table: any) => ({
      where: async (condition: any) => {
        const tableName = tableNames.get(table);
        operations.push({ action: "delete", table: tableName, sql: dialect.sqlToQuery(condition).sql });
        if (tableName === failDeleteTable) throw new Error("mock delete failure");
      },
    }),
    transaction: async (callback: (tx: any) => Promise<void>) => {
      transactionCount += 1;
      const startIndex = operations.length;
      try {
        return await callback(adapter);
      } catch (error) {
        // Model transactional rollback for the mock query plan.
        operations.splice(startIndex);
        throw error;
      }
    },
  };
  return { adapter, operations, getTransactionCount: () => transactionCount };
}

test("deleteUserMatches deletes messages and ratings by owned match IDs before matches", async () => {
  const { adapter, operations } = mockDeletionDb({ matches: [{ id: 41 }, { id: 42 }] });
  await new DatabaseStorage(adapter).deleteUserMatches("user-1");

  const deletes = operations.filter((operation) => operation.action === "delete");
  assert.deepEqual(deletes.map(({ table }) => table), ["messages", "ratings", "matches"]);
  assert.ok(deletes[0].sql?.includes('"messages"."match_id" in'));
  assert.ok(deletes[1].sql?.includes('"ratings"."match_id" in'));
  assert.ok(deletes[2].sql?.includes('"matches"."id" in'));
});

test("deleteUserMessages removes sent and received messages through the user's match IDs", async () => {
  const { adapter, operations } = mockDeletionDb({ matches: [{ id: 41 }] });
  await new DatabaseStorage(adapter).deleteUserMessages("user-1");
  const messageDelete = operations.find((operation) => operation.action === "delete");
  assert.equal(messageDelete?.table, "messages");
  assert.ok(messageDelete?.sql?.includes('"messages"."sender_id"'));
  assert.ok(messageDelete?.sql?.includes('"messages"."match_id" in'));
});

test("full account deletion uses real FK columns and deletes referenced rows first", async () => {
  const { adapter, operations, getTransactionCount } = mockDeletionDb({
    matches: [{ id: 41 }],
    events: [{ id: 51 }],
    city_tips: [{ id: 61 }],
  });
  await new DatabaseStorage(adapter).deleteUserAccount("user-1");

  const deletes = operations.filter((operation) => operation.action === "delete");
  const first = (table: string) => deletes.findIndex((operation) => operation.table === table);
  assert.ok(first("messages") < first("matches"));
  assert.ok(first("ratings") < first("matches"));
  assert.ok(first("event_comments") < first("events"));
  assert.ok(first("event_participants") < first("events"));
  assert.ok(first("event_ratings") < first("events"));
  assert.ok(first("city_tip_votes") < first("city_tips"));
  assert.ok(deletes.find((operation) => operation.table === "messages")?.sql?.includes('"messages"."sender_id"'));
  assert.ok(deletes.find((operation) => operation.table === "ratings")?.sql?.includes('"ratings"."rater_id"'));
  const reportSql = deletes.find((operation) => operation.table === "reports")?.sql || "";
  assert.ok(reportSql.includes('"reports"."reporter_id"'));
  assert.ok(reportSql.includes('"reports"."reported_user_id"'));
  assert.ok(deletes.find((operation) => operation.table === "super_likes")?.sql?.includes('"super_likes"."from_user_id"'));
  assert.ok(deletes.find((operation) => operation.table === "swipes")?.sql?.includes('"swipes"."swiped_id"'));
  assert.ok(deletes.find((operation) => operation.table === "sessions")?.sql?.includes('"sessions"."sess"'));
  assert.equal(deletes.at(-1)?.table, "users");
  assert.equal(getTransactionCount(), 1);
});

test("account deletion query failure rolls back the entire transactional plan", async () => {
  const { adapter, operations, getTransactionCount } = mockDeletionDb({
    matches: [{ id: 41 }],
    events: [{ id: 51 }],
    city_tips: [{ id: 61 }],
  }, "reports");
  await assert.rejects(() => new DatabaseStorage(adapter).deleteUserAccount("user-1"));
  assert.deepEqual(operations, []);
  assert.equal(getTransactionCount(), 1);
});

test("legacy admin deleteUser helper uses the same atomic operation", async () => {
  const { adapter, operations, getTransactionCount } = mockDeletionDb({
    matches: [],
    events: [],
    city_tips: [],
  });
  await new DatabaseStorage(adapter).deleteUser("user-1");
  assert.equal(getTransactionCount(), 1);
  assert.equal(operations.at(-1)?.table, "users");
});

test("account deletion queues every managed media source and unfinished uploads before removing rows", async () => {
  const path = (n: number) => `/objects/uploads/11111111-1111-4111-8111-${String(n).padStart(12, "0")}`;
  const { adapter, operations } = mockDeletionDb({
    users: [{ profileImageUrl: path(1), verificationSelfieUrl: "/uploads/" + "a".repeat(32) }],
    photos: [{ url: path(1) }, { url: path(2) }],
    stories: [{ mediaUrl: path(3) }], adventure_photos: [{ photoUrl: path(4) }],
    events: [{ id: 51, imageUrl: path(5) }], messages: [{ imageUrl: path(6) }],
    uploaded_media: [{ path: path(7), ownerId: "user-1", availableAt: new Date(Date.now() + 60_000) }],
  });
  const result = await new DatabaseStorage(adapter).deleteUserAccount("user-1");
  assert.equal(result.queuedMedia, 8);
  const queued = operations.find(op => op.action === "insert" && op.table === "media_deletion_jobs");
  assert.ok(queued);
  assert.equal(JSON.parse(queued.sql!).length, 8);
  assert.ok(operations.indexOf(queued) < operations.findIndex(op => op.action === "delete"));
  assert.ok(operations.find(op => op.table === "messages" && op.action === "select")?.sql?.includes('"messages"."sender_id"'));
});

test("media outbox insert is rolled back if account deletion fails", async () => {
  const { adapter, operations } = mockDeletionDb({
    photos: [{ url: "/objects/uploads/11111111-1111-4111-8111-111111111111" }],
  }, "users");
  await assert.rejects(new DatabaseStorage(adapter).deleteUserAccount("user-1"));
  assert.deepEqual(operations, []);
});