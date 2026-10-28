import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { stripeCustomerMatches } from "./releaseSafety";

// Compile the real service with an isolated SDK dependency: never contact
// Stripe, initialize the app database, or use any credentials in these tests.
function createService(subscription: unknown, retrievalError?: unknown) {
  let cancellations = 0;
  const client = {
    subscriptions: {
      retrieve: async () => {
        if (retrievalError) throw retrievalError;
        return subscription;
      },
      cancel: async () => {
        cancellations += 1;
        return { status: "canceled" };
      },
    },
  };
  const module = { exports: {} as any };
  const code = transformSync(readFileSync(new URL("./stripeService.ts", import.meta.url), "utf8"),
    { loader: "ts", format: "cjs" }).code;
  runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name: string) => {
      if (name === "./stripeClient") return { getUncachableStripeClient: async () => client };
      if (name === "./releaseSafety") return { stripeCustomerMatches };
      throw new Error(`Unexpected dependency in isolated Stripe test: ${name}`);
    },
  });
  return { service: new module.exports.StripeService(), cancellationCount: () => cancellations };
}

test("account deletion cancels only its owned subscription", async () => {
  const own = createService({ customer: "cus_owner", status: "active" });
  await own.service.cancelSubscription("sub_owned", "cus_owner");
  assert.equal(own.cancellationCount(), 1);
  const foreign = createService({ customer: "cus_other", status: "active" });
  await assert.rejects(foreign.service.cancelSubscription("sub_foreign", "cus_owner"), /does not belong/);
  assert.equal(foreign.cancellationCount(), 0);
});

test("already canceled or removed subscriptions cannot renew", async () => {
  const canceled = createService({ customer: { id: "cus_owner" }, status: "canceled" });
  await canceled.service.cancelSubscription("sub_canceled", "cus_owner");
  assert.equal(canceled.cancellationCount(), 0);
  const missing = createService(null, { code: "resource_missing", statusCode: 404 });
  assert.equal(await missing.service.cancelSubscription("sub_missing", "cus_owner"), null);
  assert.equal(missing.cancellationCount(), 0);
});

test("provider failure stops deletion's billing step instead of claiming cancellation", async () => {
  const failed = createService(null, new Error("Provider unavailable"));
  await assert.rejects(failed.service.cancelSubscription("sub_owned", "cus_owner"), /Provider unavailable/);
  assert.equal(failed.cancellationCount(), 0);
});