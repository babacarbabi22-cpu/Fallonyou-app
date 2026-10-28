import test from "node:test";
import assert from "node:assert/strict";
import { createAccountDeletionHandler } from "./accountDeletion";

function fixture(options: { queued?: number; destroy?: "error" | "throw" | "missing"; fail?: "get" | "cancel" | "delete"; subscription?: boolean; noCustomer?: boolean; missingAccount?: boolean } = {}) {
  const calls: string[] = [];
  const req: any = {
    user: { id: "fictional-owner" }, isAuthenticated: () => true,
    // Deliberately no req.logout: production uses custom session authentication.
    session: { userId: "fictional-owner", user: { id: "fictional-owner" }, destroy(cb: Function) {
      calls.push("destroy");
      assert.equal(req.session.userId, undefined);
      assert.equal(req.session.user, undefined);
      if (options.destroy === "throw") throw new Error("fixture");
      cb(options.destroy === "error" ? new Error("fixture") : null);
    } },
  };
  if (options.destroy === "missing") delete req.session;
  const res: any = {
    statusCode: 200, body: undefined, headers: {} as Record<string, string>, sent: 0,
    status(code: number) { this.statusCode = code; return this; },
    sendStatus(code: number) { this.statusCode = code; this.sent++; return this; },
    setHeader(key: string, value: string) { this.headers[key] = value; },
    clearCookie(name: string) { calls.push(`clear:${name}`); },
    json(body: unknown) { this.sent++; this.body = body; return this; },
  };
  const handler = createAccountDeletionHandler({
    getAccount: async id => {
      assert.equal(id, "fictional-owner"); calls.push("get");
      if (options.fail === "get") throw new Error("fixture");
      return options.missingAccount ? undefined : {
        stripeSubscriptionId: options.subscription ? "fictional-sub" : null,
        stripeCustomerId: options.noCustomer ? null : "fictional-customer",
      };
    },
    cancelSubscription: async (sub, customer) => {
      assert.equal(sub, "fictional-sub"); assert.equal(customer, "fictional-customer");
      calls.push("cancel"); if (options.fail === "cancel") throw new Error("fixture");
    },
    deleteAccount: async id => {
      assert.equal(id, "fictional-owner"); calls.push("delete");
      if (options.fail === "delete") throw new Error("fixture");
      return { queuedMedia: options.queued ?? 0 };
    },
  });
  return { req, res, calls, invoke: () => handler(req, res, () => {}) };
}

for (const destroy of [undefined, "error", "throw", "missing"] as const) {
  test(`committed deletion succeeds without Passport, session cleanup=${destroy ?? "ok"}`, async () => {
    const f = fixture({ destroy, queued: 2 });
    await f.invoke();
    assert.equal(f.res.statusCode, 200);
    assert.deepEqual(f.res.body, { success: true, mediaCleanup: "queued" });
    assert.equal(f.res.sent, 1);
    assert.equal(f.req.user, undefined);
    assert.equal(f.req.isAuthenticated(), false);
    assert.equal(f.res.headers["Cache-Control"], "no-store");
    assert.ok(f.calls.includes("clear:connect.sid"));
    assert.ok(f.calls.indexOf("delete") < f.calls.indexOf("clear:connect.sid"));
  });
}
test("no stored files produces a confirmed completion; subscription is cancelled first", async () => {
  const f = fixture({ subscription: true });
  await f.invoke();
  assert.deepEqual(f.res.body, { success: true, mediaCleanup: "not_required" });
  assert.deepEqual(f.calls.slice(0, 3), ["get", "cancel", "delete"]);
});
for (const fail of ["get", "cancel", "delete"] as const) {
  test(`${fail} failure remains a genuine error, not a deletion success`, async () => {
    const f = fixture({ fail, subscription: true });
    await f.invoke();
    assert.equal(f.res.statusCode, 500);
    assert.equal(f.res.body.success, undefined);
    assert.equal(f.req.isAuthenticated(), true);
    assert.ok(!f.calls.includes("destroy"));
    if (fail !== "delete") assert.ok(!f.calls.includes("delete"));
  });
}
test("unresolved subscription ownership and missing account never trigger deletion", async () => {
  for (const options of [{ subscription: true, noCustomer: true }, { missingAccount: true }]) {
    const f = fixture(options);
    await f.invoke();
    assert.ok([409, 404].includes(f.res.statusCode));
    assert.deepEqual(f.calls, ["get"]);
  }
});
test("anonymous callers cannot delete accounts", async () => {
  const f = fixture();
  f.req.isAuthenticated = () => false;
  await f.invoke();
  assert.equal(f.res.statusCode, 401);
  assert.deepEqual(f.calls, []);
});
