import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import Stripe from "stripe";
import { STRIPE_API_VERSION } from "./stripeClient";
import { getValidPremiumExpiry, stripeCustomerMatches } from "./releaseSafety";

test("the pinned Stripe API and installed SDK preserve checkout, ownership and subscription expiry contracts", async (t) => {
  const requests: Array<{ method?: string; path?: string; version?: string | string[] }> = [];
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const checkout = {
    id: "cs_fixture", object: "checkout.session", mode: "subscription",
    payment_status: "paid", customer: "cus_fixture", subscription: "sub_fixture",
  };
  // Exercise the real SDK transport against a local fixture server. No
  // connector lookup, cloud credential, payment or external request occurs.
  const server = createServer((req, res) => {
    requests.push({ method: req.method, path: req.url, version: req.headers["stripe-version"] });
    req.resume();
    res.setHeader("Content-Type", "application/json");
    if (req.url?.startsWith("/v1/checkout/sessions")) {
      res.end(JSON.stringify(checkout));
    } else if (req.url === "/v1/subscriptions/sub_fixture") {
      res.end(JSON.stringify({
        id: "sub_fixture", object: "subscription", customer: "cus_fixture",
        status: req.method === "DELETE" ? "canceled" : "active",
        items: { object: "list", data: [{
          id: "si_fixture", object: "subscription_item", current_period_end: expiry,
        }], has_more: false },
      }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: { message: "Unexpected fixture endpoint" } }));
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    server.closeIdleConnections();
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const stripe = new Stripe("fixture-not-a-credential", {
    apiVersion: STRIPE_API_VERSION,
    host: "127.0.0.1", port: address.port, protocol: "http", maxNetworkRetries: 0,
  });
  const created = await stripe.checkout.sessions.create({
    customer: "cus_fixture", mode: "subscription",
    line_items: [{ price: "price_fixture", quantity: 1 }],
    success_url: "https://example.invalid/success", cancel_url: "https://example.invalid/cancel",
  });
  const session = await stripe.checkout.sessions.retrieve(created.id);
  assert.ok(stripeCustomerMatches("cus_fixture", session.customer));
  assert.equal(stripeCustomerMatches("cus_other", session.customer), false);
  const subscriptionId = session.subscription;
  assert.ok(typeof subscriptionId === "string");
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  assert.ok(stripeCustomerMatches("cus_fixture", subscription.customer));
  assert.equal(getValidPremiumExpiry(subscription)?.getTime(), expiry * 1000);
  const canceled = await stripe.subscriptions.cancel(subscription.id);
  assert.equal(getValidPremiumExpiry(canceled), null);
  assert.equal(requests.length, 4);
  assert.ok(requests.every(request => request.version === STRIPE_API_VERSION));
});