import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { pool } from "./db";
import { createMediaDeletionRepository } from "./mediaDeletionRepository";

test("PostgreSQL fixture: durable claims, active-owner protection, leases and atomic completion", {
  skip: process.env.RUN_MEDIA_CLEANUP_DB_FIXTURE_TEST !== "1",
}, async () => {
  const client = await pool.connect();
  try {
    // TEMP tables on this dedicated connection shadow public tables. No real
    // account, message, media or production table is read or modified.
    await client.query("CREATE TEMP TABLE users (id varchar PRIMARY KEY)");
    const migration = await readFile("migrations/0005_account_media_cleanup.sql", "utf8");
    await client.query(migration.replaceAll("CREATE TABLE IF NOT EXISTS", "CREATE TEMP TABLE"));
    const tables = await client.query(`
      SELECT relpersistence FROM pg_class
      WHERE oid IN (to_regclass('users'),to_regclass('uploaded_media'),to_regclass('media_deletion_jobs'))
    `);
    assert.equal(tables.rows.length, 3);
    assert(tables.rows.every(row => row.relpersistence === "t"));
    await client.query(`INSERT INTO users VALUES ('fixture-active-owner')`);
    await client.query(`
      INSERT INTO media_deletion_jobs(owner_id,path,status,next_attempt_at,lease_until)
      VALUES
        ('fixture-deleted-a','/fixture/a','pending',now(),null),
        ('fixture-deleted-b','/fixture/b','pending',now()+interval '1 hour',null),
        ('fixture-deleted-c','/fixture/c','processing',now(),now()-interval '1 minute'),
        ('fixture-review','/fixture/d','review',now(),null),
        ('fixture-active-owner','/fixture/e','pending',now(),null),
        ('fixture-leased','/fixture/f','processing',now(),now()+interval '1 hour');
      INSERT INTO uploaded_media(path,owner_id) VALUES ('/fixture/a','fixture-deleted-a');
    `);
    const repository = createMediaDeletionRepository(drizzle(client, { schema }));
    const claimed = await repository.claim();
    assert.deepEqual(claimed.map(row => row.path), ["/fixture/a", "/fixture/c"]);
    assert(claimed.every(row => row.leaseToken && row.status === "processing" && row.attempts === 1));
    await repository.complete({ ...claimed[0], leaseToken: "expired-worker-token" });
    assert.equal((await client.query("SELECT count(*)::int AS n FROM media_deletion_jobs")).rows[0].n, 6);
    await repository.postpone(claimed[1], "retry", "storage_unavailable", 0);
    const retry = await repository.claim();
    assert.equal(retry.length, 1);
    assert.equal(retry[0].attempts, 2);
    await repository.complete(retry[0]);
    await repository.complete(claimed[0]);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM uploaded_media")).rows[0].n, 0);
    const remaining = await client.query("SELECT path FROM media_deletion_jobs ORDER BY path");
    assert.deepEqual(remaining.rows.map(row => row.path), ["/fixture/b", "/fixture/d", "/fixture/e", "/fixture/f"]);
  } finally {
    client.release(true); // Destroy connection and its TEMP tables, even on failure.
    await pool.end();
  }
});