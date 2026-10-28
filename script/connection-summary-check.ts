// Development-only repository verification. All fixtures are temporary and rolled back.
import assert from "node:assert/strict";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../server/db";
import { getConnectionSummary } from "../server/connectionSummary";

if (process.env.NODE_ENV !== "development") throw new Error("Explicit development mode is required");
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SET LOCAL statement_timeout = '15s'");
  for (const table of ["users", "profiles", "matches", "blocked_users"]) {
    await client.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS) ON COMMIT DROP`);
  }
  await client.query(`
    INSERT INTO users(id,first_name,is_banned)
      SELECT 'connection-fixture-'||n, 'Fictional', 'false' FROM generate_series(0,23) n;
    INSERT INTO profiles(user_id,current_city,birthplace)
      SELECT id, NULL, NULL FROM users WHERE id <> 'connection-fixture-3';
    UPDATE profiles SET current_city=' Stockholm ',birthplace=' Barcelona '
      WHERE user_id IN ('connection-fixture-1','connection-fixture-2');
    UPDATE profiles SET current_city='Hidden fictional city',birthplace='Hidden fictional origin'
      WHERE user_id IN ('connection-fixture-4','connection-fixture-5','connection-fixture-6','connection-fixture-7','connection-fixture-8');
    UPDATE users SET is_banned='true' WHERE id='connection-fixture-6';
    INSERT INTO matches(id,user1_id,user2_id,status) VALUES
      (1,'connection-fixture-0','connection-fixture-1','matched'),
      (2,'connection-fixture-2','connection-fixture-0','matched'),
      (3,'connection-fixture-0','connection-fixture-3','matched'),
      (4,'connection-fixture-1','connection-fixture-0','matched'),
      (5,'connection-fixture-0','connection-fixture-4','liked'),
      (6,'connection-fixture-0','connection-fixture-5','ended'),
      (7,'connection-fixture-0','connection-fixture-6','matched'),
      (8,'connection-fixture-0','connection-fixture-7','matched'),
      (9,'connection-fixture-8','connection-fixture-0','matched'),
      (10,'connection-fixture-0','connection-fixture-0','matched'),
      (11,'connection-fixture-23','connection-fixture-9','matched');
    INSERT INTO blocked_users(id,user_id,blocked_user_id) VALUES
      (1,'connection-fixture-0','connection-fixture-7'),
      (2,'connection-fixture-8','connection-fixture-0');
  `);
  const database = drizzle(client) as typeof import("../server/db").db;
  const first = await getConnectionSummary("connection-fixture-0", database);
  assert.deepEqual(first, {
    totalConnections: 3, cities: ["Stockholm"], origins: ["Barcelona"],
    hasMoreCities: false, hasMoreOrigins: false,
  }, "both accepted directions count; duplicates/pending/ended/banned/blocks/self/unrelated relationships do not");
  assert.equal((await getConnectionSummary("connection-fixture-22", database)).totalConnections, 0);
  await client.query(`
    INSERT INTO matches(id,user1_id,user2_id,status)
      SELECT 200+n,'connection-fixture-0','connection-fixture-'||n,'matched' FROM generate_series(10,19) n;
    UPDATE profiles SET current_city='Fictional city '||user_id,birthplace='Fictional origin '||user_id
      WHERE user_id IN (SELECT 'connection-fixture-'||n FROM generate_series(10,19) n);
  `);
  const expanded = await getConnectionSummary("connection-fixture-0", database);
  assert.equal(expanded.totalConnections, 13);
  assert.equal(expanded.cities.length, 8);
  assert.equal(expanded.origins.length, 8);
  assert.equal(expanded.hasMoreCities, true);
  assert.equal(expanded.hasMoreOrigins, true);
  assert.ok(!JSON.stringify(expanded).includes("Hidden fictional"));
  console.log("PASS private connection summary: accepted both directions, deduplication, pending/ended/banned/both-direction blocks excluded, missing profiles count, declared origin/current city distinct, trimming, true zero, bounded locations. Temporary fixtures rolled back; no real user data changed.");
} finally {
  await client.query("ROLLBACK");
  client.release();
  await pool.end();
}
