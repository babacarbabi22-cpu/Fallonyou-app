import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PgDialect } from "drizzle-orm/pg-core";
import { createAdminPasswordRecoveryHandler, type AdminRecoveryDependencies } from "./adminPasswordRecovery";
import { recoveryCredentialCondition, storedRecoveryToken, storedManualRecoveryToken, passwordRecoveryRepository } from "./passwordRecovery";
import { adminPasswordRecoveryCopy } from "../client/src/lib/admin-password-recovery-copy";

const token = "b".repeat(64);
const now = new Date("2026-10-11T18:00:00Z");
const recipient = {
  id: "fictional-recipient", email: "recipient@example.test", firstName: "Fictional",
  isBanned: "false", notificationPrefs: JSON.stringify({ interfaceLanguage: "fr" }),
};

function fixture(overrides: Partial<AdminRecoveryDependencies> = {}) {
  const issued: any[][] = [], deliveries: any[][] = [], revoked: any[][] = [], events: string[] = [];
  let reads = 0;
  const deps: AdminRecoveryDependencies = {
    authorizeAdmin: async id => id === "fictional-admin",
    deliveryReady: () => true,
    findUser: async () => { reads++; return recipient; },
    issue: async (...args) => { issued.push(args); return true; },
    revoke: async (...args) => { revoked.push(args); },
    deliver: async (...args) => { deliveries.push(args); return true; },
    now: () => now, token: () => token, baseUrl: () => "https://example.test",
    report: event => events.push(event), ...overrides,
  };
  return {
    issued, deliveries, revoked, events, get reads() { return reads; },
    invoke: async (adminId = "fictional-admin", body: any = {}, userId = recipient.id) => {
      const res = {
        code: 200, body: undefined as any, headers: {} as Record<string, string>,
        setHeader(key: string, value: string) { this.headers[key] = value; },
        status(code: number) { this.code = code; return this; },
        json(value: any) { this.body = value; return this; },
      };
      await createAdminPasswordRecoveryHandler(deps)({
        isAuthenticated: () => Boolean(adminId), user: { id: adminId },
        params: { userId }, body,
      } as any, res as any, () => {});
      return res;
    },
  };
}

test("manual link endpoint denies anonymous and non-admin callers before reading target data", async () => {
  const f = fixture();
  assert.equal((await f.invoke("")).code, 401);
  assert.equal((await f.invoke("fictional-non-admin")).code, 403);
  assert.equal(f.reads, 0);
  assert.equal(f.issued.length, 0);
  assert.equal(f.deliveries.length, 0);
});

test("manual issuance works for first passwords and never exposes plaintext tokens or accepts a different recipient", async () => {
  const f = fixture();
  const res = await f.invoke("fictional-admin", {
    email: "attacker@example.test", url: "https://attacker.example.test", password: "ignored",
  });
  assert.equal(res.code, 200);
  assert.equal(res.body.providerAccepted, true);
  assert.equal(res.body.expiresInSeconds, 3600);
  assert.equal(f.issued[0][0], recipient.id);
  assert.equal(f.issued[0][1], storedManualRecoveryToken(token));
  assert.notEqual(f.issued[0][1], storedRecoveryToken(token));
  assert(!f.issued[0][1].includes(token));
  assert.equal(f.issued[0][2].getTime() - now.getTime(), 3600_000);
  assert.equal(f.deliveries[0][0], recipient.email);
  assert.equal(f.deliveries[0][2], `https://example.test/reset-password?token=${token}`);
  assert.equal(f.deliveries[0][3], "fr");
  assert(!JSON.stringify(res.body).includes(token));
  assert(!JSON.stringify(f.events).includes(token));
});

test("missing, suspended and email-less accounts cannot receive a manual link", async () => {
  for (const [data, status] of [
    [undefined, 404],
    [{ ...recipient, isBanned: "true" }, 403],
    [{ ...recipient, email: null }, 400],
    [{ ...recipient, email: "invalid-email" }, 400],
  ] as const) {
    const f = fixture({ findUser: async () => data });
    assert.equal((await f.invoke()).code, status);
    assert.equal(f.issued.length, 0);
    assert.equal(f.deliveries.length, 0);
  }
});

test("provider outage, cooldown and invalid IDs fail explicitly without sending", async () => {
  const outage = fixture({ deliveryReady: () => false });
  assert.equal((await outage.invoke()).code, 503);
  assert.equal(outage.reads, 0);
  const cooldown = fixture({ issue: async () => false });
  const limited = await cooldown.invoke();
  assert.equal(limited.code, 429);
  assert.equal(limited.headers["Retry-After"], "60");
  assert.equal(cooldown.deliveries.length, 0);
  assert.equal((await fixture().invoke("fictional-admin", {}, " ")).code, 400);
});

test("rejected or throwing email delivery revokes only the failed token and never reports success", async () => {
  for (const deliver of [async () => false, async () => { throw new Error("do-not-log-private-provider-details"); }]) {
    const f = fixture({ deliver });
    const res = await f.invoke();
    assert.equal(res.code, 503);
    assert.equal(res.body.code, "DELIVERY_FAILED");
    assert.deepEqual(f.revoked, [[recipient.id, storedManualRecoveryToken(token)]]);
    assert.deepEqual(f.events, ["manual-email-delivery-failed"]);
    assert(!JSON.stringify(res).includes("do-not-log"));
  }
});

test("authorization/database and token-revocation failures do not fabricate delivery success", async () => {
  const broken = fixture({ findUser: async () => { throw new Error("fictional-db-failure"); } });
  assert.equal((await broken.invoke()).code, 503);
  assert.equal(broken.deliveries.length, 0);
  const failedRevoke = fixture({ deliver: async () => false, revoke: async () => { throw new Error("fictional-revoke-failure"); } });
  assert.equal((await failedRevoke.invoke()).code, 503);
  assert(failedRevoke.events.includes("manual-token-revocation-failed"));
});

test("database credential condition permits first password only with the admin-issued token class", () => {
  const compiled = new PgDialect().sqlToQuery(recoveryCredentialCondition(token)!);
  assert(compiled.sql.includes('"users"."password" is not null'));
  assert(compiled.sql.includes(" or "));
  assert.deepEqual(compiled.params, [storedRecoveryToken(token), token, storedManualRecoveryToken(token)]);
  // The final OR branch is the only branch allowed without an existing password.
  assert(compiled.sql.endsWith('or "users"."password_reset_token" = $3)'));
});

test("manual issue uses an atomic conditional update with a one-minute target cooldown", async () => {
  let query: any, update: any;
  const database = {
    update: () => ({
      set: (values: any) => {
        update = values;
        return { where: (condition: any) => {
          query = new PgDialect().sqlToQuery(condition);
          return { returning: async () => [{ id: recipient.id }] };
        } };
      },
    }),
  } as any;
  const expiry = new Date(now.getTime() + 3600_000);
  const issued = await passwordRecoveryRepository(database).issueManual(recipient.id, storedManualRecoveryToken(token), expiry);
  assert.equal(issued, true);
  assert.equal(update.passwordResetToken, storedManualRecoveryToken(token));
  assert.equal(update.passwordResetTokenExpiry, expiry);
  assert(!("password" in update));
  assert(query.sql.includes('"users"."password_reset_token_expiry" <='));
  assert.equal(new Date(query.params.at(-1)).getTime(), expiry.getTime() - 60_000);
});

test("manual consume preserves profiles, clears tokens and revokes sessions in the same transaction", async () => {
  let patch: any, condition: any, sessionDeleted = false;
  const tx = {
    update: () => ({ set: (values: any) => {
      patch = values;
      return { where: (where: any) => {
        condition = new PgDialect().sqlToQuery(where);
        return { returning: async () => [{ id: recipient.id }] };
      } };
    } }),
    execute: async (query: any) => {
      const compiled = new PgDialect().sqlToQuery(query);
      assert(compiled.sql.includes("DELETE FROM sessions"));
      assert.deepEqual(compiled.params, [recipient.id]);
      sessionDeleted = true;
    },
  };
  const repository = passwordRecoveryRepository({ transaction: async (fn: any) => fn(tx) } as any);
  assert.equal(await repository.consume(token, "fictional-password-hash", now), true);
  assert.deepEqual(patch, { password: "fictional-password-hash", passwordResetToken: null, passwordResetTokenExpiry: null });
  assert(condition.sql.includes('"users"."password_reset_token_expiry" >'));
  assert(sessionDeleted);
});

test("manual UI is localized, asks for confirmation and does not claim guaranteed delivery", () => {
  const expectedKeys = Object.keys(adminPasswordRecoveryCopy.en).sort();
  for (const copy of Object.values(adminPasswordRecoveryCopy)) {
    assert.deepEqual(Object.keys(copy).sort(), expectedKeys);
    for (const text of Object.values(copy)) assert(text.trim());
    assert(copy.acceptedDescription.length > 20);
  }
  const source = readFileSync("client/src/pages/AdminPage.tsx", "utf8");
  assert(source.includes('data-testid="button-confirm-password-link"'));
  assert(source.includes('data-testid={`button-password-link-${user.id}`}'));
  assert(source.includes("result.providerAccepted !== true"));
  assert(source.includes("recoveryTarget?.email"));
  const routes = readFileSync("server/routes.ts", "utf8");
  assert(routes.includes('"/api/admin/users/:userId/send-password-link", requireAdmin, rateLimit('));
});
