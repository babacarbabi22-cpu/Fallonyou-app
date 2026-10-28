import test from "node:test";
import assert from "node:assert/strict";
import { createPasswordRecoveryHandlers, storedRecoveryToken, type RecoveryDependencies } from "./passwordRecovery";

const token = "a".repeat(64);
const now = new Date("2026-10-05T12:00:00Z");
const account = { id: "fictional-account", email: "recovery@example.invalid", firstName: "Fictional", password: "fictional-old-hash" };
function response() {
  return {
    code: 200, body: undefined as any, headers: {} as Record<string, string>,
    setHeader(key: string, value: string) { this.headers[key] = value; },
    status(code: number) { this.code = code; return this; },
    json(body: any) { this.body = body; return this; },
  };
}
function fixture(overrides: Partial<RecoveryDependencies> = {}) {
  const issued: unknown[][] = [], deliveries: string[][] = [], revoked: string[][] = [], events: string[] = [];
  const dependencies: RecoveryDependencies = {
    deliveryReady: () => true, findUser: async () => account,
    issue: async (...args) => { issued.push(args); }, revoke: async (...args) => { revoked.push(args); },
    deliver: async (...args) => { deliveries.push(args); return true; },
    hashPassword: async () => "fictional-new-hash", consume: async () => true,
    now: () => now, token: () => token, baseUrl: () => "https://fixture.example.invalid",
    report: event => events.push(event), ...overrides,
  };
  const handlers = createPasswordRecoveryHandlers(dependencies);
  const invoke = async (kind: "request" | "reset", body: unknown) => {
    const res = response();
    await handlers[kind]({ body, headers: { host: "attacker.example.invalid" } } as any, res as any, () => {});
    return res;
  };
  return { invoke, issued, deliveries, revoked, events };
}

test("request normalizes email, stores only a prefixed hash, expires after one hour and uses the trusted link", async () => {
  const seen: string[] = [];
  const f = fixture({ findUser: async email => { seen.push(email); return account; } });
  const res = await f.invoke("request", { email: " RECOVERY@EXAMPLE.INVALID " });
  assert.equal(res.code, 202);
  assert.deepEqual(res.body, { success: true, accepted: true });
  assert.deepEqual(seen, [account.email]);
  assert.equal(f.issued[0][1], storedRecoveryToken(token));
  assert.notEqual(f.issued[0][1], token);
  assert.equal((f.issued[0][2] as Date).getTime(), now.getTime() + 3_600_000);
  assert.equal(new URL(f.deliveries[0][2]).origin, "https://fixture.example.invalid");
  assert.equal(new URL(f.deliveries[0][2]).searchParams.get("token"), token);
  assert.equal(res.headers["Cache-Control"], "no-store");
});

test("unknown, non-password accounts and delivery failures get the same acknowledgement", async () => {
  const variants = [
    fixture({ findUser: async () => undefined }),
    fixture({ findUser: async () => ({ ...account, password: null }) }),
    fixture({ deliver: async () => false }),
    fixture({ deliver: async () => { throw new Error("Fictional delivery error"); } }),
  ];
  const responses = await Promise.all(variants.map(f => f.invoke("request", { email: account.email })));
  for (const res of responses) { assert.equal(res.code, 202); assert.deepEqual(res.body, { success: true, accepted: true }); }
  assert.equal(variants[0].deliveries.length, 0);
  assert.equal(variants[1].issued.length, 0);
  for (const f of variants.slice(2)) {
    assert.deepEqual(f.revoked, [[account.id, storedRecoveryToken(token)]]);
    assert.deepEqual(f.events, ["email-delivery-failed"]);
  }
});

test("global delivery outage is explicit before any account lookup", async () => {
  let reads = 0;
  const f = fixture({ deliveryReady: () => false, findUser: async () => { reads++; return account; } });
  assert.equal((await f.invoke("request", { email: account.email })).code, 503);
  assert.equal(reads, 0);
});

test("invalid bodies/email fail before lookup; database failure is unavailable not success", async () => {
  let reads = 0;
  const f = fixture({ findUser: async () => { reads++; throw new Error("Fictional dependency failure"); } });
  for (const body of [null, [], { email: ["bad"] }, { email: "not-email" }]) {
    assert.equal((await f.invoke("request", body)).code, 400);
  }
  assert.equal(reads, 0);
  const res = await f.invoke("request", { email: account.email });
  assert.equal(res.code, 503);
  assert.equal(res.body.success, undefined);
});

test("malformed tokens and unsafe passwords never call hash/consume", async () => {
  let hashes = 0, consumes = 0;
  const f = fixture({
    hashPassword: async () => { hashes++; return "fictional-hash"; },
    consume: async () => { consumes++; return true; },
  });
  for (const body of [null, { token: "" }, { token: "bad", newPassword: "Fictional123" }, { token, newPassword: "short" }, { token, newPassword: "é".repeat(37) }, { token, newPassword: "x".repeat(73) }]) {
    assert.equal((await f.invoke("reset", body)).code, 400);
  }
  assert.equal(hashes, 0); assert.equal(consumes, 0);
});

test("invalid/expired/consumed link is not a success and reset failures are retryable", async () => {
  const invalid = await fixture({ consume: async () => false }).invoke("reset", { token, newPassword: "Fictional123" });
  assert.equal(invalid.code, 400);
  assert.deepEqual(invalid.body, { code: "INVALID_RESET_LINK" });
  const failed = await fixture({ consume: async () => { throw new Error("Fictional storage failure"); } }).invoke("reset", { token, newPassword: "Fictional123" });
  assert.equal(failed.code, 503);
  assert.equal(failed.body.success, undefined);
});

test("concurrent reset requests produce exactly one success when token consumption is atomic", async () => {
  let used = false;
  const f = fixture({ consume: async () => { if (used) return false; used = true; return true; } });
  const result = await Promise.all([f.invoke("reset", { token, newPassword: "Fictional123" }), f.invoke("reset", { token, newPassword: "Fictional456" })]);
  assert.deepEqual(result.map(res => res.code).sort(), [200, 400]);
});
