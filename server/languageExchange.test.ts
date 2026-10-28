import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { helperPreferencesSchema, exchangeRequestSchema, exchangeActionSchema } from "@shared/language-exchange";
import { pool } from "./db";
import { registerLanguageExchangeRoutes } from "./languageExchange";

test("language exchange validates opt-in languages and actions", () => {
  assert.deepEqual(helperPreferencesSchema.parse({ offeredLanguages: ["es", "en", "es"] }),
    { offeredLanguages: ["es", "en"] });
  assert.deepEqual(helperPreferencesSchema.parse({ offeredLanguages: [] }), { offeredLanguages: [] });
  for (const invalid of [{}, { offeredLanguages: ["xx"] }, { offeredLanguages: "en" },
    { offeredLanguages: ["en"], userId: "another-user" }]) {
    assert.equal(helperPreferencesSchema.safeParse(invalid).success, false);
  }
  assert.equal(exchangeRequestSchema.safeParse({ toUserId: "", language: "es" }).success, false);
  assert.equal(exchangeRequestSchema.safeParse({ toUserId: "helper", language: "xx" }).success, false);
  assert.equal(exchangeActionSchema.safeParse({ action: "matched" }).success, false);
});

test("PostgreSQL + HTTP: opt-in, reciprocal safety and language chat acceptance", {
  skip: process.env.RUN_LANGUAGE_EXCHANGE_DB_TEST !== "1",
}, async t => {
  const client = await pool.connect();
  const app = express();
  const server = createServer(app);
  try {
    // A dedicated connection and TEMP tables: no real user/content is read or changed.
    await client.query(`
      CREATE TEMP TABLE users (
        id varchar PRIMARY KEY, first_name varchar, profile_image_url varchar,
        is_banned varchar DEFAULT 'false'
      );
      CREATE TEMP TABLE profiles (
        user_id varchar PRIMARY KEY, current_city text, home_city text, bio text,
        incognito boolean DEFAULT false, learning_languages text[] DEFAULT '{}'
      );
      CREATE TEMP TABLE matches (
        id serial PRIMARY KEY, user1_id varchar NOT NULL, user2_id varchar NOT NULL,
        status text NOT NULL, created_at timestamp DEFAULT now()
      );
      CREATE TEMP TABLE blocked_users (
        id serial PRIMARY KEY, user_id varchar, blocked_user_id varchar
      );
      INSERT INTO users(id, first_name) VALUES
        ('fixture-learner','Learner'), ('fixture-helper','Helper'),
        ('fixture-stranger','Stranger'), ('fixture-hidden','Hidden'),
        ('fixture-banned','Banned'), ('fixture-blocked','Blocked');
      INSERT INTO profiles(user_id) SELECT id FROM users;
      UPDATE profiles SET incognito=true WHERE user_id='fixture-hidden';
      UPDATE users SET is_banned='true' WHERE id='fixture-banned';
    `);
    const migration = await readFile("migrations/0010_language_exchange.sql", "utf8");
    await client.query(migration.replaceAll("CREATE TABLE IF NOT EXISTS", "CREATE TEMP TABLE"));
    app.use(express.json());
    app.use((req, _res, next) => {
      // Authentication fixtures exist only in this isolated test app, not the running app.
      const actor = req.header("x-fixture-user");
      req.isAuthenticated = (() => !!actor) as typeof req.isAuthenticated;
      if (actor) req.user = { id: actor } as Express.User;
      next();
    });
    registerLanguageExchangeRoutes(app, drizzle(client, { schema }));
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test port");
    const base = `http://127.0.0.1:${address.port}/api/language/exchange`;
    const call = async (path: string, actor?: string, method = "GET", body?: unknown) => {
      const response = await fetch(base + path, {
        method, headers: { ...(actor ? { "x-fixture-user": actor } : {}), "Content-Type": "application/json" },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, body: await response.json() };
    };
    const learner = "fixture-learner", helper = "fixture-helper", stranger = "fixture-stranger";
    let requestId: number;
    let matchId: number;

    await t.test("unauthenticated and banned accounts cannot use exchange", async () => {
      assert.equal((await call("/preferences")).status, 401);
      assert.equal((await call("/preferences", "fixture-banned")).status, 403);
    });
    await t.test("speaking alone does not enroll a member; opt-in can be saved and removed", async () => {
      assert.deepEqual((await call("/helpers?lang=en", learner)).body, []);
      assert.deepEqual((await call("/preferences", helper)).body, { offeredLanguages: [] });
      assert.equal((await call("/preferences", helper, "PATCH", { offeredLanguages: ["xx"] })).status, 400);
      assert.equal((await call("/preferences", helper, "PATCH", { offeredLanguages: ["en", "es"] })).status, 200);
      assert.deepEqual((await call("/preferences", helper)).body.offeredLanguages, ["en", "es"]);
      assert.equal((await call("/preferences", helper, "PATCH", { offeredLanguages: [] })).status, 200);
      assert.deepEqual((await call("/helpers?lang=en", learner)).body, []);
      await call("/preferences", helper, "PATCH", { offeredLanguages: ["en", "es"] });
    });
    await t.test("directory filters selected language, self, incognito, bans and bilateral blocks", async () => {
      for (const id of ["fixture-hidden", "fixture-blocked"])
        await call("/preferences", id, "PATCH", { offeredLanguages: ["en"] });
      await client.query("INSERT INTO language_helpers VALUES ('fixture-banned', ARRAY['en'])");
      await client.query("INSERT INTO blocked_users(user_id,blocked_user_id) VALUES ('fixture-blocked','fixture-learner')");
      const directory = await call("/helpers?lang=en", learner);
      assert.deepEqual(directory.body.map((row: { id: string }) => row.id), [helper]);
      assert.equal(directory.body[0].matchId, null);
      assert.equal("email" in directory.body[0], false);
      assert.deepEqual((await call("/helpers?lang=fr", learner)).body, []);
      assert.equal((await call("/helpers?lang=xx", learner)).status, 400);
      assert.deepEqual((await call("/helpers?lang=es", helper)).body, []);
    });
    await t.test("self, blocked, banned and non-volunteer requests fail", async () => {
      for (const [toUserId, expected] of [[learner, 400], ["fixture-blocked", 403],
        ["fixture-banned", 404], [stranger, 409], ["fixture-hidden", 409]] as const) {
        assert.equal((await call("/requests", learner, "POST", { toUserId, language: "en" })).status, expected);
      }
    });
    await t.test("sending and duplicate sending stay pending and create no chat", async () => {
      const sent = await call("/requests", learner, "POST", { toUserId: helper, language: "en" });
      assert.equal(sent.status, 200);
      assert.equal(sent.body.status, "pending");
      assert.equal(sent.body.matchId, null);
      requestId = sent.body.id;
      const duplicate = await call("/requests", learner, "POST", { toUserId: helper, language: "en" });
      assert.equal(duplicate.body.id, requestId);
      assert.equal((await client.query("SELECT count(*)::int as n FROM matches")).rows[0].n, 0);
      assert.equal((await call("/requests", helper)).body.incoming[0].id, requestId);
      assert.equal((await call("/requests", learner)).body.outgoing[0].id, requestId);
      assert.deepEqual((await call("/requests", stranger)).body, { incoming: [], outgoing: [] });
    });
    await t.test("sender cannot accept; unrelated member cannot access or act", async () => {
      assert.equal((await call(`/requests/${requestId}`, learner, "PATCH", { action: "accept" })).status, 403);
      assert.equal((await call(`/requests/${requestId}`, stranger, "PATCH", { action: "accept" })).status, 404);
      assert.equal((await call(`/requests/${requestId}`, helper, "PATCH", { action: "cancel" })).status, 403);
    });
    await t.test("only acceptance creates an existing-chat-compatible mutual match", async () => {
      const accepted = await call(`/requests/${requestId}`, helper, "PATCH", { action: "accept" });
      assert.equal(accepted.status, 200);
      assert.equal(accepted.body.status, "accepted");
      matchId = accepted.body.matchId;
      assert.equal(typeof matchId, "number");
      assert.equal((await client.query("SELECT status FROM matches WHERE id=$1", [matchId])).rows[0].status, "matched");
      assert.equal((await call("/requests", learner)).body.outgoing[0].matchId, matchId);
      assert.equal((await call("/helpers?lang=en", learner)).body[0].matchId, matchId);
      assert.equal((await call(`/requests/${requestId}`, helper, "PATCH", { action: "accept" })).body.matchId, matchId);
      assert.equal((await client.query("SELECT count(*)::int as n FROM matches")).rows[0].n, 1);
    });
    await t.test("a different language with an accepted friend reuses the same chat", async () => {
      const same = await call("/requests", learner, "POST", { toUserId: helper, language: "es" });
      assert.equal(same.body.matchId, matchId);
      assert.equal(same.body.status, "accepted");
      assert.equal((await client.query("SELECT count(*)::int as n FROM matches")).rows[0].n, 1);
    });
    await t.test("decline and cancel do not create chats; recent resends are limited", async () => {
      const incoming = await call("/requests", stranger, "POST", { toUserId: helper, language: "en" });
      const declined = await call(`/requests/${incoming.body.id}`, helper, "PATCH", { action: "decline" });
      assert.equal(declined.body.status, "declined");
      assert.equal(declined.body.matchId, null);
      assert.equal((await call(`/requests/${incoming.body.id}`, helper, "PATCH", { action: "accept" })).status, 409);
      assert.equal((await call("/requests", stranger, "POST", { toUserId: helper, language: "en" })).status, 429);
      const outgoing = await call("/requests", stranger, "POST", { toUserId: helper, language: "es" });
      assert.equal((await call(`/requests/${outgoing.body.id}`, stranger, "PATCH", { action: "cancel" })).body.status, "cancelled");
      assert.equal((await client.query("SELECT count(*)::int as n FROM matches")).rows[0].n, 1);
    });
    await t.test("ending and blocking connections hide chat access without reopening it", async () => {
      await client.query("UPDATE matches SET status='ended' WHERE id=$1", [matchId]);
      assert.equal((await call("/requests", learner)).body.outgoing[0].matchId, null);
      assert.equal((await call("/helpers?lang=en", learner)).body.some((row: { id: string }) => row.id === helper), false);
      assert.equal((await call("/requests", learner, "POST", { toUserId: helper, language: "en" })).status, 409);
      await client.query("INSERT INTO blocked_users(user_id,blocked_user_id) VALUES ($1,$2)", [helper, learner]);
      assert.deepEqual((await call("/requests", learner)).body.outgoing, []);
      assert.equal((await call(`/requests/${requestId}`, helper, "PATCH", { action: "accept" })).status, 403);
    });
    await t.test("account erasure cascades exchange opt-in and both sides of requests", async () => {
      await client.query("DELETE FROM users WHERE id=$1", [helper]);
      assert.equal((await client.query("SELECT count(*)::int AS n FROM language_helpers WHERE user_id=$1", [helper])).rows[0].n, 0);
      assert.equal((await client.query("SELECT count(*)::int AS n FROM language_exchange_requests WHERE from_user_id=$1 OR to_user_id=$1", [helper])).rows[0].n, 0);
    });
  } finally {
    server.closeAllConnections();
    if (server.listening) await new Promise<void>(resolve => server.close(() => resolve()));
    client.release(true);
    await pool.end();
  }
});
