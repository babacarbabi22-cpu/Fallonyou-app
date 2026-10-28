import { test } from "node:test";
import assert from "node:assert/strict";
import { canRateConnection, getValidPremiumExpiry, hotelAndPackageSalesEnabled, stripeCustomerMatches } from "./releaseSafety";

test("unapproved hotel and package sales remain disabled", () => {
  assert.equal(hotelAndPackageSalesEnabled, false);
});

test("ratings belong to a real, unblocked connection and cannot target strangers", () => {
  const match = { user1Id: "alice", user2Id: "bob", status: "matched" };
  assert.equal(canRateConnection("alice", match, false), true);
  assert.equal(canRateConnection("bob", { ...match, status: "ended" }, false), true);
  assert.equal(canRateConnection("stranger", match, false), false);
  assert.equal(canRateConnection("alice", match, true), false);
  assert.equal(canRateConnection("alice", { ...match, status: "pending" }, false), false);
  assert.equal(canRateConnection("alice", undefined, false), false);
});

test("paid-session replay cannot reactivate a canceled or expired subscription", () => {
  const now = 1_800_000_000_000;
  const future = now / 1000 + 3600;
  assert.equal(getValidPremiumExpiry({ status: "active", items: { data: [{ current_period_end: future }] } }, now)?.getTime(), future * 1000);
  assert.equal(getValidPremiumExpiry({ status: "trialing", current_period_end: future }, now)?.getTime(), future * 1000);
  assert.equal(getValidPremiumExpiry({ status: "canceled", current_period_end: future }, now), null);
  assert.equal(getValidPremiumExpiry({ status: "active", current_period_end: now / 1000 - 1 }, now), null);
  assert.equal(getValidPremiumExpiry({ status: "active", items: { data: [] } }, now), null);
});

test("only the account's own Stripe customer is accepted", () => {
  assert.equal(stripeCustomerMatches("cus_owner", "cus_owner"), true);
  assert.equal(stripeCustomerMatches("cus_owner", { id: "cus_owner" }), true);
  assert.equal(stripeCustomerMatches("cus_owner", "cus_other"), false);
  assert.equal(stripeCustomerMatches("cus_owner", { id: "cus_other" }), false);
  assert.equal(stripeCustomerMatches(null, null), false);
  assert.equal(stripeCustomerMatches("", ""), false);
  assert.equal(stripeCustomerMatches(undefined, "cus_owner"), false);
  assert.equal(stripeCustomerMatches("cus_owner", { id: 123 }), false);
});