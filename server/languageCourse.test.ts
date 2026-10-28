import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { createServer } from "node:http";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { pool } from "./db";
import { registerLanguageCourseRoutes } from "./languageCourse";
import {
  courseLevels, canonicalLessons, hasLanguagePremium, canStudyCourseLevel, highestCompletedCourseLevel,
} from "@shared/language-course";

test("course preserves existing IDs and adds distinct premium C1 and C2 lessons", () => {
  assert.deepEqual(courseLevels.map(level => level.id), ["a1", "a2", "b1", "b2plus", "c1", "c2"]);
  assert.equal(canonicalLessons["b2-health"].level, "b2plus");
  assert.equal(Object.keys(canonicalLessons).length, 18);
  for (const level of courseLevels) {
    assert.equal(level.lessons.length, 3);
    assert.equal(level.premium, ["b2plus", "c1", "c2"].includes(level.id));
  }
});
test("existing Premium and active trials use the same boolean entitlement", () => {
  const now = new Date("2026-10-09T12:00:00Z");
  assert.equal(hasLanguagePremium({ isPremium: "true" }, now), true);
  assert.equal(hasLanguagePremium({ isPremium: true }, now), true);
  assert.equal(hasLanguagePremium({ isPremium: "false", trialEndsAt: "2026-10-10T12:00:00Z" }, now), true);
  for (const trialEndsAt of [null, "invalid", "2026-10-09T12:00:00Z", "2026-10-08T12:00:00Z"])
    assert.equal(hasLanguagePremium({ isPremium: "false", trialEndsAt }, now), false);
  assert.equal(hasLanguagePremium(null, now), false);
});
test("Premium does not bypass predecessors and every advanced level stays protected", () => {
  const completed = new Set<string>();
  for (const level of courseLevels) {
    assert.equal(canStudyCourseLevel(level.id, completed, true), true);
    assert.equal(canStudyCourseLevel(level.id, completed, false), !level.premium);
    for (const later of courseLevels.slice(courseLevels.indexOf(level) + 1))
      assert.equal(canStudyCourseLevel(later.id, completed, true), false);
    for (const lesson of level.lessons) completed.add(lesson.id);
  }
});
test("highest course level retains B2+ history and recognizes new C1/C2 completion", () => {
  const rows: Array<{ language: string; lessonId: string }> = [];
  assert.equal(highestCompletedCourseLevel(rows), null);
  for (const level of courseLevels) {
    rows.push(...level.lessons.map(lesson => ({ language: "en", lessonId: lesson.id })));
    assert.deepEqual(highestCompletedCourseLevel(rows), { level: level.id, levelLabel: level.label, language: "en" });
  }
  assert.deepEqual(highestCompletedCourseLevel(courseLevels[3].lessons.map(lesson => ({
    language: "es", lessonId: lesson.id,
  }))), { level: "b2plus", levelLabel: "B2+", language: "es" });
});

test("isolated PostgreSQL and HTTP: Premium continuation, protected levels and persisted progress", {
  skip: process.env.RUN_LANGUAGE_COURSE_DB_TEST !== "1",
}, async t => {
  const client = await pool.connect();
  const app = express();
  const server = createServer(app);
  try {
    // All reads and writes are isolated to TEMP tables on this connection.
    await client.query(`
      CREATE TEMP TABLE users (
        id varchar PRIMARY KEY, is_banned varchar DEFAULT 'false',
        is_premium varchar DEFAULT 'false', trial_ends_at timestamp
      );
      CREATE TEMP TABLE profiles (user_id varchar PRIMARY KEY, lang_level text, primary_lang text);
      CREATE TEMP TABLE language_progress (
        id serial PRIMARY KEY, user_id varchar NOT NULL REFERENCES users(id),
        language varchar(10) NOT NULL, level varchar(20) NOT NULL,
        lesson_id varchar(50) NOT NULL, completed_at timestamp DEFAULT now(),
        UNIQUE(user_id, language, lesson_id)
      );
      INSERT INTO users(id,is_premium) VALUES ('fixture-premium','true'), ('fixture-free','false'),
        ('fixture-trial','false'), ('fixture-expired','false'), ('fixture-banned','true');
      UPDATE users SET trial_ends_at=now()+interval '1 day' WHERE id='fixture-trial';
      UPDATE users SET trial_ends_at=now()-interval '1 day' WHERE id='fixture-expired';
      UPDATE users SET is_banned='true' WHERE id='fixture-banned';
      INSERT INTO profiles(user_id) SELECT id FROM users;
    `);
    app.use(express.json());
    app.use((req, _res, next) => {
      const actor = req.header("x-fixture-user");
      req.isAuthenticated = (() => !!actor) as typeof req.isAuthenticated;
      if (actor) req.user = { id: actor } as Express.User;
      next();
    });
    registerLanguageCourseRoutes(app, drizzle(client, { schema }));
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test port");
    const base = `http://127.0.0.1:${address.port}/api/language`;
    const call = async (path: string, actor?: string, body?: unknown) => {
      const response = await fetch(base + path, {
        method: body === undefined ? "GET" : "POST",
        headers: { "Content-Type": "application/json", ...(actor ? { "x-fixture-user": actor } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json() };
    };
    const complete = (actor: string, lessonId: string, language = "en", extra = {}) =>
      call("/progress", actor, { language, lessonId, score: 5, total: 5, ...extra });
    await t.test("authentication, bans, unsupported languages and invalid input fail closed", async () => {
      assert.equal((await call("/levels/en")).status, 401);
      assert.equal((await call("/levels/en", "fixture-banned")).status, 403);
      assert.equal((await call("/levels/xx", "fixture-premium")).status, 400);
      for (const id of ["fabricated-lesson", "toString", "__proto__"])
        assert.equal((await complete("fixture-premium", id)).status, 400);
      for (const extra of [{ score: 6 }, { total: 0 }, { score: 0 }, { score: 2.5 }, { total: 6 }])
        assert.equal((await complete("fixture-premium", "a1-greetings", "en", extra)).status, 400);
    });
    await t.test("Premium cannot skip B1/B2+/C1 and free/expired members cannot complete paid lessons", async () => {
      for (const lesson of ["b2-health", "c1-negotiation", "c2-nuance"]) {
        assert.equal((await complete("fixture-premium", lesson)).status, 409);
        for (const user of ["fixture-free", "fixture-expired"])
          assert.equal((await complete(user, lesson, "en", { level: "a1", isPremium: true })).status, 403);
      }
      assert.equal((await client.query("SELECT count(*)::int AS n FROM language_progress")).rows[0].n, 0);
    });
    await t.test("completed free levels unlock B2+ for Premium and active trials only", async () => {
      for (const user of ["fixture-premium", "fixture-free", "fixture-trial", "fixture-expired"])
        for (const level of courseLevels.slice(0, 3))
          for (const lesson of level.lessons)
            assert.equal((await complete(user, lesson.id)).status, 200);
      for (const user of ["fixture-premium", "fixture-trial"]) {
        const response = await call("/levels/en", user);
        assert.equal(response.body.levels[3].unlocked, true);
        assert.equal(response.body.levels[4].unlocked, false);
        assert.equal((await complete(user, "b2-health")).status, 200);
      }
      for (const user of ["fixture-free", "fixture-expired"]) {
        const response = await call("/levels/en", user);
        assert.equal(response.body.levels[3].unlocked, false);
        assert.equal(response.body.levels[3].isPremiumUser, false);
      }
    });
    await t.test("B2+ → C1 → C2 saves, reloads, updates profile and is idempotent", async () => {
      for (const level of courseLevels.slice(3)) {
        for (const lesson of level.lessons) assert.equal((await complete("fixture-premium", lesson.id)).status, 200);
        const summary = await call("/my-level", "fixture-premium");
        assert.equal(summary.body.level, level.id);
        assert.equal(summary.body.levelLabel, level.label);
      }
      assert.equal((await complete("fixture-premium", "c2-mediation")).status, 200);
      assert.equal((await call("/progress?lang=en", "fixture-premium")).body.completedLessons.length, 18);
      const profile = (await client.query("SELECT * FROM profiles WHERE user_id='fixture-premium'")).rows[0];
      assert.equal(profile.lang_level, "c2");
      assert.equal(profile.primary_lang, "en");
      assert.equal((await call("/levels/en", "fixture-premium")).body.levels.every((level: { completed: boolean }) => level.completed), true);
    });
    await t.test("progress is language-specific; withdrawing Premium does not erase completed lessons", async () => {
      assert.deepEqual((await call("/progress?lang=fr", "fixture-premium")).body.completedLessons, []);
      assert.equal((await complete("fixture-premium", "c1-opinions", "fr")).status, 409);
      await client.query("UPDATE users SET is_premium='false' WHERE id='fixture-premium'");
      assert.equal((await complete("fixture-premium", "c2-mediation")).status, 403);
      assert.equal((await call("/progress?lang=en", "fixture-premium")).body.completedLessons.length, 18);
      assert.equal((await call("/my-level", "fixture-premium")).body.level, "c2");
    });
    await t.test("upgrading an existing member unlocks without altering previous progress", async () => {
      await client.query("UPDATE users SET is_premium='true' WHERE id='fixture-free'");
      assert.equal((await call("/levels/en", "fixture-free")).body.levels[3].unlocked, true);
      assert.equal((await complete("fixture-free", "b2-health")).status, 200);
    });
  } finally {
    server.closeAllConnections();
    if (server.listening) await new Promise<void>(resolve => server.close(() => resolve()));
    client.release(true);
    await pool.end();
  }
});
