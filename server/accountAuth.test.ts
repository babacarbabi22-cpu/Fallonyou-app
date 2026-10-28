import { after, before, mock, test } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { Resend } from "resend";
import bcrypt from "bcryptjs";
import { PgDialect } from "drizzle-orm/pg-core";
import { db } from "./db";
import { setupAuth } from "./emailAuth";
import { users } from "@shared/schema";
import { CURRENT_TERMS_VERSION } from "@shared/terms";
import { isAccountAuthSuccess } from "@shared/account-auth";

const handlers = new Map<string, Function>();
let externalDatabaseCalls = 0, externalEmailCalls = 0;
before(async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "run these isolated fixtures in a non-production process");
  mock.method(pg.Pool.prototype, "query", () => { externalDatabaseCalls++; throw new Error("Real database access prohibited"); });
  mock.method(pg.Pool.prototype, "connect", () => { externalDatabaseCalls++; throw new Error("Real database connections prohibited"); });
  mock.method(Resend.prototype, "post", () => { externalEmailCalls++; throw new Error("Real email delivery prohibited"); });
  await setupAuth({
    set() {}, use() {},
    post(path: string, handler: Function) { handlers.set(`POST ${path}`, handler); },
    get(path: string, handler: Function) { handlers.set(`GET ${path}`, handler); },
  } as any);
});
after(() => {
  assert.equal(externalDatabaseCalls, 0);
  assert.equal(externalEmailCalls, 0);
  mock.restoreAll();
});
const validRegistration = {
  email: "FIXTURE@EXAMPLE.INVALID", password: "Fictional123", firstName: "Fixture",
  lastName: "", ageConfirmed: true, contentLicenseAccepted: true, termsVersion: CURRENT_TERMS_VERSION,
};
async function fixture(t: any, options: { existing?: boolean; banned?: boolean; saveFails?: boolean; databaseFails?: boolean; insertError?: unknown } = {}) {
  let account: any = options.existing ? {
    id: "fictional-account", email: "fixture@example.invalid", firstName: "Fixture", lastName: "",
    password: await bcrypt.hash("Fictional123", 4), isBanned: options.banned ? "true" : "false", ageConfirmed: "true",
  } : undefined;
  let inserts = 0, updates = 0, regenerations = 0, saves = 0;
  const lookups: unknown[][] = [], store = new Map<string, any>();
  t.mock.method(db, "select", () => ({
    from(table: unknown) { return { async where(condition: any) {
      if (options.databaseFails) throw new Error("Fictional database failure");
      lookups.push(new PgDialect().sqlToQuery(condition).params);
      return table === users && account ? [account] : [];
    } }; },
  }));
  t.mock.method(db, "insert", () => ({
    values(value: any) { inserts++; if (options.insertError) throw options.insertError; account = { ...value, id: "fictional-account", isBanned: "false" }; return { returning: async () => [account] }; },
  }));
  t.mock.method(db, "update", () => ({
    set(value: any) { updates++; account = { ...account, ...value }; return { where: async () => [] }; },
  }));
  const request: any = { body: {}, sessionID: "fictional-old-session" };
  const installSession = () => {
    request.session = {
      regenerate(callback: Function) {
        regenerations++; store.delete(request.sessionID);
        request.sessionID = `fictional-session-${regenerations}`;
        installSession(); callback();
      },
      save(callback: Function) {
        saves++;
        if (options.saveFails) return callback(new Error("Fictional session-store failure"));
        store.set(request.sessionID, { userId: request.session.userId, user: request.session.user });
        callback();
      },
      destroy(callback: Function) { store.delete(request.sessionID); request.session = {}; callback(); },
    };
  };
  installSession();
  const invoke = async (path: string, body: unknown = {}, restored?: any) => {
    request.body = body;
    if (restored) request.session = restored;
    const response: any = { statusCode: 200, body: undefined, cleared: "",
      status(code: number) { this.statusCode = code; return this; },
      json(value: unknown) { this.body = value; return this; },
      clearCookie(name: string) { this.cleared = name; },
    };
    await handlers.get(path)!(request, response);
    return response;
  };
  return { invoke, request, store, account: () => account, stats: () => ({ inserts, updates, regenerations, saves }), lookups };
}
test("registration rejects invalid input and missing/current legal consent before any account write", async t => {
  const f = await fixture(t);
  for (const body of [null, [], {}, { ...validRegistration, email: "invalid" },
    { ...validRegistration, password: "short" }, { ...validRegistration, firstName: {} },
    { ...validRegistration, ageConfirmed: false }, { ...validRegistration, contentLicenseAccepted: false },
    { ...validRegistration, termsVersion: "obsolete" }]) {
    assert.equal((await f.invoke("POST /api/register", body)).statusCode, 400);
  }
  assert.equal(f.stats().inserts, 0);
  assert.equal(f.stats().regenerations, 0);
});
test("new accounts use English by default, store current consent and a hash, then save a fresh session", async t => {
  const f = await fixture(t);
  const result = await f.invoke("POST /api/register", validRegistration);
  assert.equal(result.statusCode, 201);
  assert.equal(result.body.success, true);
  assert.deepEqual(f.lookups[0], ["fixture@example.invalid"]);
  assert.equal(f.account().email, "fixture@example.invalid");
  assert.equal(JSON.parse(f.account().notificationPrefs).interfaceLanguage, "en");
  assert.equal(JSON.parse(f.account().notificationPrefs).learningReminders, false);
  assert.equal(f.account().termsAcceptedVersion, CURRENT_TERMS_VERSION);
  assert.ok(await bcrypt.compare(validRegistration.password, f.account().password));
  assert.notEqual(f.account().password, validRegistration.password);
  assert.equal(f.stats().regenerations, 1);
  assert.equal(f.stats().saves, 1);
  assert.equal(f.store.get(f.request.sessionID).userId, "fictional-account");
  assert.ok(!("password" in result.body.user));
});
test("duplicate registration is not a successful account creation", async t => {
  const f = await fixture(t, { existing: true });
  const result = await f.invoke("POST /api/register", validRegistration);
  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.body.fieldErrors, { email: "EMAIL_REGISTERED" });
  assert.equal(f.stats().inserts, 0);
  assert.equal(f.stats().saves, 0);
});
test("registration returns precise field errors without writes", async t => {
  const f = await fixture(t);
  for (const [field, value, code] of [
    ["firstName", "", "NAME_REQUIRED"], ["firstName", "Two Names", "NAME_INVALID"],
    ["firstName", "\u0000Name", "NAME_INVALID"], ["firstName", "a".repeat(101), "NAME_INVALID"],
    ["email", "", "EMAIL_REQUIRED"], ["email", "bad", "EMAIL_INVALID"],
    ["password", "", "PASSWORD_REQUIRED"], ["password", "short", "PASSWORD_SHORT"],
    ["password", "é".repeat(37), "PASSWORD_TOO_LONG"],
  ]) {
    const result = await f.invoke("POST /api/register", { ...validRegistration, [field]: value });
    assert.equal(result.statusCode, 400);
    assert.equal(result.body.fieldErrors[field], code);
  }
  assert.equal(f.stats().inserts, 0);
});
test("concurrent email conflicts are translated but unrelated constraints are not", async t => {
  for (const wrapped of [false, true]) {
    const conflict = { code: "23505", constraint: "users_email_unique" };
    const f = await fixture(t, { insertError: wrapped ? { cause: conflict } : conflict });
    const result = await f.invoke("POST /api/register", validRegistration);
    assert.equal(result.statusCode, 409);
    assert.deepEqual(result.body.fieldErrors, { email: "EMAIL_REGISTERED" });
    assert.equal(f.stats().saves, 0);
  }
  const f = await fixture(t, { insertError: { code: "23505", constraint: "unrelated_unique" } });
  const result = await f.invoke("POST /api/register", validRegistration);
  assert.equal(result.statusCode, 500);
  assert.deepEqual(result.body, { error: "Registration failed" });
});
test("legacy profile names with spaces do not prevent login", async t => {
  const f = await fixture(t, { existing: true });
  f.account().firstName = "Two Names";
  const result = await f.invoke("POST /api/login", { email: validRegistration.email, password: validRegistration.password });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.firstName, "Two Names");
});
test("login rejects bad credentials and suspended accounts without saving a session", async t => {
  const f = await fixture(t, { existing: true, banned: true });
  assert.equal((await f.invoke("POST /api/login", { email: validRegistration.email, password: "Wrong123" })).statusCode, 401);
  assert.equal((await f.invoke("POST /api/login", { email: validRegistration.email, password: validRegistration.password })).statusCode, 403);
  assert.equal((await f.invoke("POST /api/login", { email: {}, password: "Fictional123" })).statusCode, 400);
  assert.equal(f.stats().saves, 0);
});
test("login saves a new session; restoring it permits current-user access; logout removes it", async t => {
  const f = await fixture(t, { existing: true });
  assert.equal((await f.invoke("GET /api/user")).statusCode, 401);
  const login = await f.invoke("POST /api/login", { email: validRegistration.email, password: validRegistration.password });
  assert.equal(login.statusCode, 200);
  assert.equal(login.body.id, "fictional-account");
  assert.equal(f.stats().regenerations, 1);
  const stored = f.store.get(f.request.sessionID);
  assert.equal((await f.invoke("GET /api/user", {}, stored)).body.id, "fictional-account");
  // Restore the session methods to test the captured production logout handler.
  f.request.session.destroy = (callback: Function) => { f.store.delete(f.request.sessionID); f.request.session = {}; callback(); };
  assert.equal((await f.invoke("POST /api/logout")).cleared, "connect.sid");
  assert.equal(f.store.size, 0);
  assert.equal((await f.invoke("GET /api/user")).statusCode, 401);
  assert.ok(!handlers.has("GET /api/logout"));
});
test("session/database failures are honest errors, not successful logins", async t => {
  const f = await fixture(t, { existing: true, saveFails: true });
  assert.equal((await f.invoke("POST /api/login", { email: validRegistration.email, password: validRegistration.password })).statusCode, 500);
  assert.equal(f.store.size, 0);
  const unavailable = await fixture(t, { existing: true, databaseFails: true });
  assert.equal((await unavailable.invoke("POST /api/login", { email: validRegistration.email, password: validRegistration.password })).statusCode, 500);
  assert.equal(unavailable.stats().saves, 0);
});
test("selected registration language is preserved", async t => {
  const f = await fixture(t);
  assert.equal((await f.invoke("POST /api/register", { ...validRegistration, language: "sv" })).statusCode, 201);
  assert.equal(JSON.parse(f.account().notificationPrefs).interfaceLanguage, "sv");
});
test("registration rejects passwords that exceed bcrypt's 72-byte limit before creating an account", async t => {
  const f = await fixture(t);
  const result = await f.invoke("POST /api/register", { ...validRegistration, password: "é".repeat(37) });
  assert.equal(result.statusCode, 400);
  assert.equal(f.stats().inserts, 0);
  assert.equal(f.stats().saves, 0);
});
test("account responses must prove success, not merely return HTTP 200 or a truthy object", () => {
  for (const value of [null, [], {}, { success: false }, { success: true }, { id: "fixture" }, { success: true, user: {} }]) {
    assert.equal(isAccountAuthSuccess("login", value), false);
    assert.equal(isAccountAuthSuccess("register", value), false);
  }
  const identity = { id: "fixture", email: "fixture@example.invalid" };
  assert.equal(isAccountAuthSuccess("login", identity), true);
  assert.equal(isAccountAuthSuccess("login", { ...identity, success: false }), false);
  assert.equal(isAccountAuthSuccess("register", { success: true, user: identity }), true);
  assert.equal(isAccountAuthSuccess("register", { success: false, user: identity }), false);
});
test("absent accounts receive the same incorrect-credentials response without a session", async t => {
  const f = await fixture(t);
  assert.equal((await f.invoke("POST /api/login", { email: validRegistration.email, password: validRegistration.password })).statusCode, 401);
  assert.equal(f.stats().saves, 0);
});
test("exactly 72 bytes are accepted; legacy long-password logins remain usable", async t => {
  const f = await fixture(t);
  const prefix = "a".repeat(72);
  assert.equal((await f.invoke("POST /api/register", { ...validRegistration, password: prefix })).statusCode, 201);
  f.account().password = await bcrypt.hash(prefix + "legacy-suffix", 4);
  assert.equal((await f.invoke("POST /api/login", { email: validRegistration.email, password: prefix + "legacy-suffix" })).statusCode, 200);
});
