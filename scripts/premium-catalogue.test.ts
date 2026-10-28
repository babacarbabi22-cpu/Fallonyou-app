import { test } from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import { updatePremiumCatalogue } from "./premium-catalogue";
import { PREMIUM_PRICING, annualSavingsPercent, premiumProducts } from "../shared/premium-pricing";

function fixture(options: { live?: boolean; failYear?: boolean; duplicate?: boolean } = {}) {
  const product = { id: "prod_test", name: "FallonYou Premium", active: true, livemode: !!options.live, default_price: null as string | null };
  const prices: any[] = [
    { id: "old_month", unit_amount: 700, currency: "eur", active: true, recurring: { interval: "month", interval_count: 1 }, tax_behavior: "exclusive" },
    { id: "old_year", unit_amount: 5900, currency: "eur", active: true, recurring: { interval: "year", interval_count: 1 }, tax_behavior: "exclusive" },
  ];
  let creates = 0;
  const changes: string[] = [];
  const client = {
    products: {
      search: async () => ({ data: options.duplicate ? [product, product] : [product] }),
      create: async () => { throw new Error("Unexpected product creation"); },
      update: async (_id: string, value: any) => { product.default_price = value.default_price; changes.push("default"); return product; },
    },
    prices: {
      list: async () => ({ data: prices.filter(p => p.active), has_more: false }),
      create: async (value: any) => {
        if (options.failYear && value.recurring.interval === "year") throw new Error("Unavailable");
        const price = { ...value, id: `new_${++creates}`, active: true, livemode: false,
          recurring: { ...value.recurring, interval_count: 1 } };
        prices.push(price); changes.push("create"); return price;
      },
      update: async (id: string, value: any) => {
        const price = prices.find(p => p.id === id);
        Object.assign(price, value); changes.push("archive"); return price;
      },
    },
  };
  return { client: client as unknown as Pick<Stripe, "products" | "prices">, prices, changes, creates: () => creates };
}

test("confirmed Premium prices and annual savings use exact cents", () => {
  assert.deepEqual(PREMIUM_PRICING, { currency: "eur", monthlyCents: 499, yearlyCents: 4999 });
  assert.equal(annualSavingsPercent(499, 4999), 16);
  assert.equal(annualSavingsPercent(499, 8900), 0);
});

test("test catalogue replaces both prices, preserves tax settings and is idempotent", async () => {
  const f = fixture();
  const result = await updatePremiumCatalogue(f.client);
  assert.deepEqual(result.prices.map(p => p.amount), [499, 4999]);
  assert.deepEqual(f.changes, ["create", "create", "default", "archive", "archive"]);
  assert.deepEqual(f.prices.filter(p => p.active).map(p => p.tax_behavior), ["exclusive", "exclusive"]);
  assert.equal(f.prices.find(p => p.unit_amount === 4999).metadata.savings, "16%");
  await updatePremiumCatalogue(f.client);
  assert.equal(f.creates(), 2);
  assert.equal(f.prices.filter(p => p.active).length, 2);
  // The mock deliberately has no customer/subscription APIs.
});

test("live mode and ambiguous product selection are refused", async () => {
  const live = fixture({ live: true });
  await assert.rejects(updatePremiumCatalogue(live.client), /test-mode/);
  assert.equal(live.creates(), 0);
  await assert.rejects(updatePremiumCatalogue(fixture({ duplicate: true }).client), /Multiple/);
});

test("a partial failure never retires the previous plans", async () => {
  const f = fixture({ failYear: true });
  await assert.rejects(updatePremiumCatalogue(f.client), /Unavailable/);
  assert.equal(f.prices.find(p => p.id === "old_month").active, true);
  assert.equal(f.prices.find(p => p.id === "old_year").active, true);
  assert.ok(!f.changes.includes("archive"));
});

test("real catalogue join rows expose price IDs and amounts to the future pricing UI", () => {
  const products = premiumProducts([
    { product_id: "premium", product_name: "FallonYou Premium", price_id: "monthly", unit_amount: 499, currency: "eur", recurring: { interval: "month" } },
    { product_id: "premium", product_name: "FallonYou Premium", price_id: "yearly", unit_amount: 4999, currency: "eur", recurring: { interval: "year" } },
    { product_id: "empty", product_name: "No plans", price_id: null, unit_amount: null, currency: null },
  ]);
  assert.equal(products[0].prices.length, 2);
  assert.equal(products[0].prices[1].id, "yearly");
  assert.deepEqual(products[1].prices, []);
  assert.deepEqual(premiumProducts(products), products);
});
