import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { randomUUID, generateKeyPairSync, verify } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "./db";
import { nativePushDevices, users } from "../shared/schema";
import { nativePushDeviceInput, notificationPath } from "../shared/native-push";
import { registerNativePushRoutes, dispatchNativeTargets, nativeNoticeAllowed } from "./nativePush";
import { appleBearer, nativePayload } from "./nativePushTransport";
import { createNativePushController } from "../client/src/lib/native-push";

test.after(() => pool.end());
const token = `fictional_${randomUUID().replaceAll("-", "")}`;

test("device validation, safe deep links and genuine ES256 signature format", () => {
  assert(nativePushDeviceInput.safeParse({ platform: "android", token }).success);
  assert(!nativePushDeviceInput.safeParse({ platform: "ios", token }).success);
  assert(!nativePushDeviceInput.safeParse({ platform: "android", token, userId: "other" }).success);
  for (const path of ["https://evil.invalid", "//evil.invalid", "/\\evil.invalid", "/\nchat"]) {
    assert.equal(notificationPath(path), "/");
  }
  assert.equal(notificationPath("/chat/fictional?source=notification"), "/chat/fictional?source=notification");
  assert.equal(nativePayload({ title: "x".repeat(200), body: "x".repeat(2000), url: "//evil.invalid" }).body.length, 400);
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const key = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const config = { keyId: "ABCDEFGHIJ", teamId: "KLMNOPQRST", key, environment: "production" };
  const bearer = appleBearer(config, 1_800_000_000_000);
  const parts = bearer.split(".");
  assert.equal(Buffer.from(parts[2], "base64url").length, 64);
  assert(verify("sha256", Buffer.from(parts.slice(0, 2).join(".")),
    { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(parts[2], "base64url")));
  assert.equal(appleBearer(config, 1_800_000_001_000), bearer);
  assert.notEqual(appleBearer(config, 1_800_003_000_000), bearer);
});

test("native sends respect opt-outs, malformed preferences, suspensions, language and private chat content", async () => {
  for (const preference of ["messages", "events", "learningReminders", "matches", "newTravelers", "profileViews"] as const) {
    assert.equal(nativeNoticeAllowed(JSON.stringify({ [preference]: false }),
      { title: "", body: "", url: "/", preference }), false);
  }
  const sent: any[] = [], removed: number[] = [];
  const base = { userId: "fictional", platform: "android", token, banned: "false", prefs: null };
  const targets = [
    { ...base, id: 1, prefs: JSON.stringify({ messages: false }) },
    { ...base, id: 2, banned: "true" },
    { ...base, id: 3, prefs: "broken" },
    { ...base, id: 4, prefs: JSON.stringify({ interfaceLanguage: "es" }) },
    { ...base, id: 5 },
  ];
  const results = await dispatchNativeTargets(targets,
    { title: "PRIVATE TITLE", body: "PRIVATE CHAT CONTENT", url: "/chat/fictional" },
    async (_platform, _token, notice) => {
      sent.push(notice);
      return { accepted: sent.length === 1, expired: sent.length !== 1 };
    }, async target => { removed.push(target.id); });
  assert.equal(sent.length, 2);
  assert.equal(sent[0].title, "Nuevo mensaje");
  assert(!JSON.stringify(sent).includes("PRIVATE"));
  assert.deepEqual(removed, [5]);
  assert.equal(results.filter(result => result.status === "rejected").length, 2);
  sent.length = 0;
  await dispatchNativeTargets([{ ...base, id: 6, prefs: JSON.stringify({ learningReminders: false }) }],
    { title: "Practice", body: "", url: "/languages" },
    async (...args) => { sent.push(args); return { accepted: true }; }, async () => {});
  assert.equal(sent.length, 0);
});

test("real PostgreSQL native registry: authentication, ownership, rebind, outages and account erasure", async () => {
  assert.notEqual(process.env.NODE_ENV, "production");
  const rollback = new Error("fictional registry rollback");
  try {
    await db.transaction(async tx => {
      const a = `native-fixture-${randomUUID()}`, b = `native-fixture-${randomUUID()}`;
      await tx.insert(users).values([{ id: a, firstName: "Fictional" }, { id: b, firstName: "Fictional" }]);
      const app = express(); app.use(express.json());
      app.use((req, _res, next) => {
        const id = req.header("x-fictional-user");
        req.isAuthenticated = (() => !!id) as any;
        if (id) req.user = { id } as any;
        next();
      });
      let ready = true;
      registerNativePushRoutes(app, tx, () => ({ android: ready, ios: ready }));
      const server = app.listen(0, "127.0.0.1");
      await new Promise(resolve => server.once("listening", resolve));
      const address = server.address() as { port: number };
      async function call(actor: string | null, path: string, value: any) {
        const response = await fetch(`http://127.0.0.1:${address.port}/api/push/native/${path}`, {
          method: "POST", headers: { "Content-Type": "application/json", ...(actor ? { "x-fictional-user": actor } : {}) },
          body: JSON.stringify(value),
        });
        await response.text();
        return response.status;
      }
      const device = { platform: "android", token };
      try {
        assert.equal(await call(null, "register", device), 401);
        assert.equal(await call(a, "register", { ...device, userId: b }), 400);
        assert.equal(await call(a, "register", device), 200);
        assert.equal(await call(a, "register", device), 200);
        assert.equal((await tx.select().from(nativePushDevices).where(eq(nativePushDevices.token, token))).length, 1);
        assert.equal(await call(b, "unregister", device), 200);
        assert.equal((await tx.select().from(nativePushDevices).where(eq(nativePushDevices.token, token))).length, 1);
        assert.equal(await call(b, "register", device), 200);
        assert.equal((await tx.select().from(nativePushDevices).where(eq(nativePushDevices.token, token)))[0].userId, b);
        ready = false;
        assert.equal(await call(a, "register", device), 503);
        assert.equal((await tx.select().from(nativePushDevices).where(eq(nativePushDevices.token, token)))[0].userId, b);
        assert.equal(await call(b, "unregister", device), 200);
        ready = true;
        assert.equal(await call(a, "register", device), 200);
        await tx.update(users).set({ isBanned: "true" }).where(eq(users.id, b));
        assert.equal(await call(b, "register", { ...device, token: `${token}_b` }), 403);
        await tx.delete(users).where(eq(users.id, a));
        assert.equal((await tx.select().from(nativePushDevices).where(eq(nativePushDevices.token, token))).length, 0);
      } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
});

function mobileFixture(options: { configured?: boolean; denied?: boolean; failWrite?: boolean; stored?: any;
  registerRequest?: (body: any) => Promise<any>; granted?: boolean } = {}) {
  const callbacks: Record<string, (event: any) => any> = {};
  const calls: { method: string; path: string; body?: any }[] = [];
  let prompts = 0, registrations = 0, unregisters = 0;
  let stored = options.stored ? JSON.stringify(options.stored) : null;
  const plugin: any = {
    addListener: async (name: string, callback: any) => { callbacks[name] = callback; return { remove: async () => {} }; },
    checkPermissions: async () => ({ receive: options.denied ? "denied" : options.granted ? "granted" : "prompt" }),
    requestPermissions: async () => { prompts++; return { receive: "granted" }; },
    createChannel: async () => {},
    register: async () => { registrations++; await callbacks.registration({ value: token }); },
    unregister: async () => { unregisters++; },
    removeAllDeliveredNotifications: async () => {},
  };
  const controller = createNativePushController(plugin, {
    platform: "android",
    storage: { getItem: () => stored, setItem: (_key, value) => { stored = value; }, removeItem: () => { stored = null; } },
    request: async (method, path, body) => {
      calls.push({ method, path, body });
      if (method === "GET") return { android: options.configured !== false, ios: true };
      if (options.failWrite) throw Error("Fictional failure");
      if (path.endsWith("/register") && options.registerRequest) return options.registerRequest(body);
      return { success: true };
    },
  });
  return { controller, plugin, callbacks, calls, get: () => ({ prompts, registrations, unregisters, stored }) };
}

test("phone opt-in is explicit and success waits for server acknowledgement", async () => {
  const fixture = mobileFixture();
  await fixture.controller.setUser("fictional-a");
  assert.equal(fixture.get().prompts, 0);
  assert.equal(fixture.get().registrations, 0);
  assert.equal(await fixture.controller.activate(), true);
  assert.equal(fixture.get().prompts, 1);
  assert.equal(fixture.controller.getSnapshot().isSubscribed, true);
  assert.equal(JSON.parse(fixture.get().stored!).userId, "fictional-a");
  assert.equal(await fixture.controller.deactivate(), true);
  assert.equal(fixture.get().stored, null);
  assert.equal(fixture.get().unregisters, 1);
});

test("missing configuration, denied permission and failed server save never activate", async () => {
  for (const options of [{ configured: false }, { denied: true }, { failWrite: true }]) {
    const fixture = mobileFixture(options);
    await fixture.controller.setUser("fictional-a");
    assert.equal(await fixture.controller.activate(), false);
    assert.equal(fixture.controller.getSnapshot().isSubscribed, false);
    assert.equal(fixture.get().stored, null);
    if (options.configured === false || options.denied) assert.equal(fixture.get().prompts, 0);
  }
});

test("another account's consent is not adopted and notification taps stay in-app", async () => {
  const fixture = mobileFixture({ stored: { userId: "fictional-a", platform: "android", token } });
  await fixture.controller.setUser("fictional-b");
  assert.equal(fixture.get().registrations, 0);
  assert.equal(fixture.get().prompts, 0);
  assert.equal(fixture.controller.getSnapshot().isSubscribed, false);
  assert.equal(fixture.get().unregisters, 1);
  const navigations: string[] = [];
  fixture.controller.setNavigate(path => navigations.push(path));
  fixture.callbacks.pushNotificationActionPerformed({ notification: { data: { url: "//evil.invalid" } } });
  fixture.callbacks.pushNotificationActionPerformed({ notification: { data: { url: "/chat/fictional" } } });
  assert.deepEqual(navigations, ["/", "/chat/fictional"]);
});

test("renewal failure preserves prior consent and logout removes a device even after restore failed", async () => {
  const fixture = mobileFixture({ granted: true, configured: false,
    stored: { userId: "fictional-a", platform: "android", token } });
  await fixture.controller.setUser("fictional-a");
  assert.equal(fixture.get().prompts, 0);
  assert.equal(fixture.controller.getSnapshot().isSubscribed, true);
  assert.equal(fixture.controller.getSnapshot().error, "setup");
  assert.equal(await fixture.controller.deactivate(), true);
  assert(fixture.calls.some(call => call.path.endsWith("/unregister")));
  assert.equal(fixture.get().stored, null);
});

test("token rotation removes the previous token without prompting again", async () => {
  const fixture = mobileFixture({ granted: true });
  await fixture.controller.setUser("fictional-a");
  assert.equal(await fixture.controller.activate(), true);
  const nextToken = `${token}_rotated`;
  await fixture.callbacks.registration({ value: nextToken });
  assert.equal(JSON.parse(fixture.get().stored!).token, nextToken);
  assert(fixture.calls.some(call => call.path.endsWith("/unregister") && call.body.token === token));
  assert.equal(fixture.get().prompts, 0);
});

test("a delayed registration cannot rebind a token over the next account or finish its waiter", async () => {
  let sessionActor = "fictional-a", releaseFirst: () => void = () => {};
  const writes: string[] = [];
  const fixture = mobileFixture({ granted: true, registerRequest: async () => {
    const actor = sessionActor;
    if (actor === "fictional-a") await new Promise<void>(resolve => { releaseFirst = resolve; });
    writes.push(actor);
    return { success: true };
  } });
  fixture.plugin.register = async () => { void fixture.callbacks.registration({ value: token }); };
  await fixture.controller.setUser(sessionActor);
  const first = fixture.controller.activate();
  await new Promise(resolve => setImmediate(resolve));
  sessionActor = "fictional-b";
  await fixture.controller.setUser(sessionActor);
  assert.equal(await first, false);
  assert.equal(fixture.get().unregisters, 1);
  const second = fixture.controller.activate();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(writes, []);
  releaseFirst();
  assert.equal(await second, true);
  assert.deepEqual(writes, ["fictional-a", "fictional-b"]);
  assert.equal(JSON.parse(fixture.get().stored!).userId, "fictional-b");
  assert.equal(fixture.controller.getSnapshot().isSubscribed, true);
});
