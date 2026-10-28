// Run only in development. Fixtures live in pg_temp on ONE connection inside a
// rollback transaction. No real accounts, messages, sequences or uploads change.
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { writeFile, mkdir } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../server/db";
import { discoveryMemberPage, directoryMemberPage } from "../server/memberPaging";
import { createChatRelay } from "../server/chatRelay";
import { messagePage } from "../server/messagePaging";

if (process.env.NODE_ENV !== "development") throw new Error("Capacity fixtures require explicit development mode");
const client = await pool.connect();
const viewer = "load-fixture-00000";
let relayA: ReturnType<typeof createChatRelay> | undefined;
let relayB: ReturnType<typeof createChatRelay> | undefined;
try {
  await client.query("BEGIN");
  await client.query("SET LOCAL statement_timeout = '15s'");
  for (const table of ["users", "profiles", "photos", "matches", "blocked_users", "messages"]) {
    await client.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS) ON COMMIT DROP`);
  }
  await client.query(`
    ALTER TABLE users ADD PRIMARY KEY(id);
    ALTER TABLE profiles ADD PRIMARY KEY(user_id);
    CREATE INDEX ON photos(user_id,id);
    CREATE INDEX ON matches(user1_id,user2_id);
    CREATE INDEX ON blocked_users(user_id,blocked_user_id);
    CREATE INDEX ON blocked_users(blocked_user_id,user_id);
    CREATE INDEX ON messages(match_id,id);
    INSERT INTO users(id,first_name,profile_image_url,created_at,is_banned)
      SELECT 'load-fixture-'||lpad(n::text,5,'0'), 'Fictional',
        '/fictional/photo.png', now()-interval '3 days', 'false' FROM generate_series(0,9999) n;
    INSERT INTO profiles(user_id,gender,age,show_age)
      SELECT id, CASE WHEN right(id,1)::int % 2=0 THEN 'female' ELSE 'male' END, 30, false FROM users;
    INSERT INTO photos(id,user_id,url,type)
      SELECT row_number() over()::int,id,'/fictional/photo.png','photo' FROM users;
    INSERT INTO blocked_users(id,user_id,blocked_user_id) VALUES
      (1,'load-fixture-00000','load-fixture-00002'),
      (2,'load-fixture-00003','load-fixture-00000');
    INSERT INTO matches(id,user1_id,user2_id,status) VALUES
      (1,'load-fixture-00000','load-fixture-00001','liked');
    UPDATE users SET is_banned='true' WHERE id='load-fixture-00004';
    INSERT INTO messages(id,match_id,sender_id,content)
      SELECT n,1,'load-fixture-00000','Fictional message' FROM generate_series(1,500) n;
    ANALYZE users; ANALYZE profiles; ANALYZE photos; ANALYZE matches; ANALYZE blocked_users;
  `);
  const database = drizzle(client) as typeof import("../server/db").db;
  const page = { limit: 24, cursor: undefined };
  const first = await discoveryMemberPage(viewer, page, "everyone", database);
  assert.equal(first.items.length, 24);
  assert.equal(first.items[0].id, "load-fixture-00005", "self, outgoing connections, both-direction blocks and bans excluded before paging");
  const second = await discoveryMemberPage(viewer, { ...page, cursor: first.nextCursor }, "everyone", database);
  assert.equal(second.items.length, 24);
  assert.ok(second.items.every(item => !first.items.some(previous => previous.id === item.id)));
  const men = await discoveryMemberPage(viewer, page, "men", database);
  assert.ok(men.items.every(item => Number(item.id.slice(-1)) % 2 === 1), "preference applied before page limit");
  const directory = await directoryMemberPage(viewer, page, database);
  assert.equal(directory.items.length, 24);
  assert.ok(directory.items.every(item => item.age === null), "opted-out ages stay private");
  assert.ok(directory.items.some(item => item.id === "load-fixture-00001"), "directory does not hide previously contacted members");
  const recentMessages = await messagePage(1, undefined, database);
  assert.equal(recentMessages.items.length, 50);
  assert.equal(recentMessages.items[0].id, 451);
  const earlierMessages = await messagePage(1, Number(recentMessages.nextCursor), database);
  assert.equal(earlierMessages.items[0].id, 401);
  assert.equal(earlierMessages.items[49].id, 450);
  assert.deepEqual((await messagePage(999, undefined, database)).items, [], "chat pages cannot read a different room");
  const timings: number[] = [];
  const count = 1000, concurrency = 20;
  let next = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < count) {
      const index = next++;
      const start = performance.now();
      const result = await directoryMemberPage(viewer, { limit: 24, cursor: `load-fixture-${String((index * 9) % 9900).padStart(5, "0")}` }, database);
      assert.ok(result.items.length <= 24);
      timings.push(performance.now() - start);
    }
  }));
  timings.sort((a, b) => a - b);
  // Relay events use a sentinel room with no actual message/content. Listeners
  // verify PostgreSQL communication between independent service instances.
  let delivered = false, echoed = false;
  relayA = createChatRelay(async () => { echoed = true; });
  relayB = createChatRelay(async event => { if (event.matchId === 2_000_000_001) delivered = true; });
  await Promise.all([relayA.start(), relayB.start()]);
  await relayA.publish({ type: "typing", matchId: 2_000_000_001, userId: "load-fixture-not-a-real-user" });
  for (let attempt = 0; attempt < 50 && !delivered; attempt++) await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(delivered, true, "cross-instance notification delivered");
  assert.equal(echoed, false, "source instance does not receive duplicate event");
  const report = {
    syntheticProfiles: 10_000, databasePageRequests: count, queuedConcurrency: concurrency,
    databaseConnectionsUsedForPages: 1, maxPageSize: 24,
    p50Ms: Math.round(timings[Math.floor(count * 0.5)] * 100) / 100,
    p95Ms: Math.round(timings[Math.floor(count * 0.95)] * 100) / 100,
    maxMs: Math.round(timings[count - 1] * 100) / 100,
    privacyAndPagingChecks: "passed", postgresCrossInstanceRelay: "passed",
    scope: "Development repository queries on isolated temporary tables, not production HTTP/mobile load or 1000 simultaneous users.",
  };
  await mkdir(".local/validation", { recursive: true });
  await writeFile(".local/validation/capacity-results.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await Promise.all([relayA?.stop(), relayB?.stop()]);
  await client.query("ROLLBACK");
  client.release();
  await pool.end();
}
