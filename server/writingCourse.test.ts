import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { createServer } from "node:http";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { pool } from "./db";
import { registerWritingCourseRoutes } from "./writingCourse";
import { registerLanguageCourseRoutes } from "./languageCourse";
import { courseLanguages } from "@shared/language-course";
import { canPracticeWriting, checkWritingAnswer, getWritingExercises, writingLessonId } from "@shared/writing-course";
import { writingJourneyCopy } from "../client/src/lib/writing-journey-copy";

test("new journey controls and feedback are translated in every interface language", () => {
  const keys = Object.keys(writingJourneyCopy.en).sort();
  for (const language of ["en", "es", "fr", "sv"] as const) {
    const copy = writingJourneyCopy[language];
    assert.deepEqual(Object.keys(copy).sort(), keys);
    for (const value of Object.values(copy)) {
      if (typeof value === "string") assert(value.trim());
      else assert.deepEqual(Object.keys(value).sort(), ["builder", "challenge", "starter"]);
    }
  }
});

test("all target languages have progressively harder guided writing, without English fallback", () => {
  for (const lang of courseLanguages) {
    const single = getWritingExercises(lang, "starter");
    const multiple = getWritingExercises(lang, "builder");
    const memory = getWritingExercises(lang, "challenge");
    assert.equal(single.length, 4);
    assert.equal(multiple.length, 4);
    assert.equal(memory.length, 4);
    for (let i = 0; i < 4; i++) {
      assert.equal(single[i].mode, "word");
      assert.equal((single[i].prompt.match(/____/g) || []).length, 1);
      assert.equal(multiple[i].mode, "words");
      assert((multiple[i].prompt.match(/____/g) || []).length >= 2);
      assert.equal(memory[i].mode, "memory");
      assert.equal(memory[i].answer, memory[i].phrase);
      assert.notEqual(memory[i].phrase, single[i].phrase, "Premium memory practice must introduce new, harder sentences");
      if (lang !== "en") assert.notEqual(single[i].phrase, getWritingExercises("en", "starter")[i].phrase);
      assert.equal(checkWritingAnswer(single[i].answer, single[i].answer, lang), "correct");
    }
  }
});

test("Premium is required for both advanced writing levels but does not bypass predecessors", () => {
  assert.equal(canPracticeWriting("starter", new Set(), false), true);
  assert.equal(canPracticeWriting("builder", new Set(), true), false);
  const completed = new Set([writingLessonId("starter")]);
  assert.equal(canPracticeWriting("builder", completed, false), false);
  assert.equal(canPracticeWriting("builder", completed, true), true);
  assert.equal(canPracticeWriting("challenge", completed, true), false);
  completed.add(writingLessonId("builder"));
  assert.equal(canPracticeWriting("challenge", completed, true), true);
  assert.equal(canPracticeWriting("challenge", completed, false), false);
  assert.equal(canPracticeWriting("__proto__", completed, true), false);
});

test("isolated HTTP/database writing progression, entitlements, persistence and course separation", {
  skip: process.env.RUN_WRITING_DB_TEST !== "1",
}, async () => {
  const client = await pool.connect();
  const app = express();
  const server = createServer(app);
  try {
    await client.query(`
      CREATE TEMP TABLE users (id varchar PRIMARY KEY, is_banned varchar DEFAULT 'false',
        is_premium varchar DEFAULT 'false', trial_ends_at timestamp);
      CREATE TEMP TABLE profiles (user_id varchar PRIMARY KEY, lang_level text, primary_lang text);
      CREATE TEMP TABLE language_progress (id serial PRIMARY KEY, user_id varchar NOT NULL REFERENCES users(id),
        language varchar(10) NOT NULL, level varchar(20) NOT NULL, lesson_id varchar(50) NOT NULL,
        completed_at timestamp DEFAULT now(), UNIQUE(user_id, language, lesson_id));
      INSERT INTO users(id,is_premium) VALUES ('writing-free','false'),('writing-premium','true'),
        ('writing-trial','false'),('writing-expired','false'),('writing-banned','false');
      UPDATE users SET trial_ends_at=now()+interval '1 day' WHERE id='writing-trial';
      UPDATE users SET trial_ends_at=now()-interval '1 day' WHERE id='writing-expired';
      UPDATE users SET is_banned='true' WHERE id='writing-banned';
      INSERT INTO profiles(user_id) SELECT id FROM users;
      INSERT INTO language_progress(user_id,language,level,lesson_id)
        VALUES ('writing-premium','es','a1','a1-greetings');
    `);
    app.use(express.json());
    app.use((req, _res, next) => {
      const actor = req.header("x-fixture-user");
      req.isAuthenticated = (() => !!actor) as typeof req.isAuthenticated;
      if (actor) req.user = { id: actor } as Express.User;
      next();
    });
    const database = drizzle(client, { schema });
    registerWritingCourseRoutes(app, database);
    registerLanguageCourseRoutes(app, database);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;
    const request = (path: string, actor = "writing-premium", body?: unknown) => fetch(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { ...(actor ? { "x-fixture-user": actor } : {}), "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const answers = (lang: "es" | "fr", level: "starter" | "builder" | "challenge") =>
      ({ answers: getWritingExercises(lang, level).map(item => item.answer) });
    assert.equal((await request("/api/language/writing/es", "")).status, 401);
    assert.equal((await request("/api/language/writing/es", "writing-banned")).status, 403);
    assert.equal((await request("/api/language/writing/xx")).status, 400);
    assert.equal((await request("/api/language/writing/es/invalid")).status, 400);
    assert.equal((await request("/api/language/writing/es/builder")).status, 409);
    for (const level of ["builder", "challenge"])
      assert.equal((await request(`/api/language/writing/es/${level}`, "writing-free")).status, 403);
    assert.equal((await request("/api/language/writing/es/starter", "writing-premium", { score: 4, total: 4 })).status, 400);
    assert.equal((await request("/api/language/writing/es/starter", "writing-premium", { answers: ["wrong", "wrong", "wrong", "wrong"] })).status, 400);
    assert.equal((await request("/api/language/writing/es/challenge", "writing-premium", answers("es", "challenge"))).status, 409);
    for (const actor of ["writing-free", "writing-premium", "writing-trial", "writing-expired"]) {
      assert.equal((await request("/api/language/writing/es/starter", actor, answers("es", "starter"))).status, 200);
      assert.equal((await request("/api/language/writing/es/starter", actor, answers("es", "starter"))).status, 200);
    }
    const saved = await (await request("/api/language/writing/es")).json();
    assert.equal(saved.levels[0].completed, true);
    assert.equal(saved.levels[1].unlocked, true);
    assert.equal(saved.levels[2].unlocked, false);
    assert.equal((await (await request("/api/language/writing/fr")).json()).levels[0].completed, false);
    assert.equal((await request("/api/language/writing/es/builder", "writing-trial")).status, 200);
    assert.equal((await request("/api/language/writing/es/builder", "writing-expired")).status, 403);
    assert.equal((await request("/api/language/writing/es/builder", "writing-free", answers("es", "builder"))).status, 403);
    for (const level of ["builder", "challenge"] as const)
      assert.equal((await request(`/api/language/writing/es/${level}`, "writing-premium", answers("es", level))).status, 200);
    assert.equal((await (await request("/api/language/writing/es")).json()).levels.every((item: { completed: boolean }) => item.completed), true);
    assert.deepEqual(await (await request("/api/language/progress?lang=es")).json(), { completedLessons: ["a1-greetings"] });
    assert.equal((await (await request("/api/language/my-level")).json()).level, null);
    assert.equal((await client.query("SELECT lang_level FROM profiles WHERE user_id='writing-premium'")).rows[0].lang_level, null);
    const count = await client.query("SELECT count(*)::int AS n FROM language_progress WHERE user_id='writing-premium' AND level='writing'");
    assert.equal(count.rows[0].n, 3);
    await client.query("UPDATE users SET is_premium='false' WHERE id='writing-premium'");
    assert.equal((await request("/api/language/writing/es/challenge")).status, 403);
    assert.equal((await request("/api/language/writing/es/challenge", "writing-premium", answers("es", "challenge"))).status, 403);
    assert.equal((await (await request("/api/language/writing/es")).json()).levels[2].completed, true);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await client.query("DROP TABLE IF EXISTS pg_temp.language_progress, pg_temp.profiles, pg_temp.users");
    client.release();
    await pool.end();
  }
});
