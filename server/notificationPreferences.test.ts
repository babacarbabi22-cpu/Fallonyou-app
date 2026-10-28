import { test } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response, RequestHandler } from "express";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { users } from "@shared/schema";
import { DEFAULT_NOTIFICATION_PREFERENCES, parseNotificationPreferences } from "@shared/notification-preferences";
import { createNotificationPreferencesHandlers } from "./notificationPreferences";

const owner = "fictional-preferences-owner";

function fixture(initial: string | null = null) {
  let stored = initial;
  const reads: string[] = [];
  const writes: Array<{ userId: string; value: string }> = [];
  const handlers = createNotificationPreferencesHandlers({
    read: async userId => {
      reads.push(userId);
      return { notificationPrefs: stored, email: "fixture@example.invalid", emailVerified: "true" };
    },
    write: async (userId, value) => {
      writes.push({ userId, value });
      stored = value;
    },
  });
  return { handlers, reads, writes };
}

async function request(handler: RequestHandler, body?: unknown, authenticated = true) {
  let status = 200;
  let json: unknown;
  const req = {
    isAuthenticated: () => authenticated,
    user: authenticated ? { id: owner } : undefined,
    body,
  } as Request;
  const res = {
    status(code: number) { status = code; return this; },
    sendStatus(code: number) { status = code; return this; },
    json(value: unknown) { json = value; return this; },
  } as unknown as Response;
  await handler(req, res, () => { throw new Error("Unexpected next"); });
  return { status, json };
}

test("all notification preference projections compile without accessing a database", () => {
  const db = drizzle({ query() { throw new Error("Real database access forbidden"); } } as any);
  for (const fields of [
    { notificationPrefs: users.notificationPrefs },
    { isPremium: users.isPremium, notificationPrefs: users.notificationPrefs },
    { id: users.id, notificationPrefs: users.notificationPrefs },
  ]) {
    const query = db.select(fields).from(users).where(eq(users.id, owner)).toSQL();
    assert(query.sql.includes('"notification_prefs"'));
    assert.deepEqual(query.params, [owner]);
  }
  const update = db.update(users).set({ notificationPrefs: '{"messages":false}' })
    .where(eq(users.id, owner)).toSQL();
  assert.deepEqual(update.params, ['{"messages":false}', owner]);
  assert.equal(users.notificationPrefs.default, JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES));
});

test("legacy null preferences keep the existing defaults", async () => {
  const f = fixture();
  assert.deepEqual(await request(f.handlers.read), { status: 200, json: DEFAULT_NOTIFICATION_PREFERENCES });
  assert.deepEqual(f.reads, [owner]);
  assert.deepEqual(f.writes, []);
});

test("loading saved opt-outs does not enable them again", async () => {
  const f = fixture('{"messages":false,"profileViews":false,"events":false}');
  const result = await request(f.handlers.read);
  assert.deepEqual(result.json, { ...DEFAULT_NOTIFICATION_PREFERENCES, messages: false, profileViews: false, events: false });
  assert.deepEqual(f.writes, []);
});

test("saving one setting preserves the others and persists to the authenticated owner only", async () => {
  const f = fixture('{"messages":false,"profileViews":false}');
  const expected = { ...DEFAULT_NOTIFICATION_PREFERENCES, messages: false, profileViews: false, events: false };
  assert.deepEqual(await request(f.handlers.update, { events: false }), { status: 200, json: expected });
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].userId, owner);
  assert.deepEqual(JSON.parse(f.writes[0].value), expected);
  assert.deepEqual((await request(f.handlers.read)).json, expected);
});

test("each notification setting can be disabled and enabled again", async () => {
  for (const key of Object.keys(DEFAULT_NOTIFICATION_PREFERENCES)) {
    const f = fixture();
    assert.equal((await request(f.handlers.update, { [key]: false })).status, 200);
    assert.equal((await request(f.handlers.read)).json?.[key as keyof typeof DEFAULT_NOTIFICATION_PREFERENCES], false);
    assert.equal((await request(f.handlers.update, { [key]: true })).status, 200);
    assert.deepEqual((await request(f.handlers.read)).json, { ...DEFAULT_NOTIFICATION_PREFERENCES, [key]: true });
  }
});

test("partial updates preserve stored extension settings rather than silently deleting them", async () => {
  const f = fixture('{"messages":false,"futureChannel":false}');
  const result = await request(f.handlers.update, { events: false });
  const expected = { ...DEFAULT_NOTIFICATION_PREFERENCES, messages: false, events: false, futureChannel: false };
  assert.deepEqual(result.json, expected);
  assert.deepEqual(JSON.parse(f.writes[0].value), expected);
});

test("unauthenticated reads and updates never reach the repository", async () => {
  const f = fixture();
  assert.equal((await request(f.handlers.read, undefined, false)).status, 401);
  assert.equal((await request(f.handlers.update, { messages: false }, false)).status, 401);
  assert.deepEqual(f.reads, []);
  assert.deepEqual(f.writes, []);
});

test("invalid updates and attempts to choose another owner are rejected without writes", async () => {
  const f = fixture();
  for (const body of [null, undefined, [], {}, { messages: "false" }, { messages: 0 }, { userId: "fictional-other-owner", messages: false }]) {
    assert.equal((await request(f.handlers.update, body)).status, 400);
  }
  assert.deepEqual(f.reads, []);
  assert.deepEqual(f.writes, []);
});

test("a missing account returns 404 instead of inventing a preferences record", async () => {
  const handlers = createNotificationPreferencesHandlers({
    read: async () => undefined,
    write: async () => { throw new Error("Unexpected write"); },
  });
  assert.equal((await request(handlers.read)).status, 404);
  assert.equal((await request(handlers.update, { messages: false })).status, 404);
});

test("storage failures finish requests with 500 instead of creating unhandled rejections", async () => {
  const readFailure = createNotificationPreferencesHandlers({
    read: async () => { throw new Error("Fictional read failure"); },
    write: async () => { throw new Error("Unexpected write"); },
  });
  assert.equal((await request(readFailure.read)).status, 500);
  assert.equal((await request(readFailure.update, { messages: false })).status, 500);
  const writeFailure = createNotificationPreferencesHandlers({
    read: async () => ({ notificationPrefs: null }),
    write: async () => { throw new Error("Fictional write failure"); },
  });
  assert.equal((await request(writeFailure.update, { messages: false })).status, 500);
});

test("corrupt saved preferences fail explicitly and are not overwritten", async () => {
  for (const stored of ['not-json', 'null', '[]', '{"messages":"false"}']) {
    assert.throws(() => parseNotificationPreferences(stored));
    const f = fixture(stored);
    assert.equal((await request(f.handlers.read)).status, 500);
    assert.equal((await request(f.handlers.update, { events: false })).status, 500);
    assert.deepEqual(f.writes, []);
  }
});

test("learning opt-in and locale changes preserve other opt-outs and private study state", async () => {
  const studyActivity = { language: "fr", lastStartedAt: "2026-10-03T18:00:00Z" };
  const f = fixture(JSON.stringify({ matches: false, messages: false, studyActivity }));
  assert.equal((await request(f.handlers.update, { learningReminders: true, interfaceLanguage: "sv" })).status, 200);
  const result = JSON.parse(f.writes[0].value);
  assert.equal(result.matches, false);
  assert.equal(result.messages, false);
  assert.equal(result.learningReminders, true);
  assert.equal(result.interfaceLanguage, "sv");
  assert.deepEqual(result.studyActivity, studyActivity);
  assert.equal((await request(f.handlers.update, { interfaceLanguage: "bad" })).status, 400);
});