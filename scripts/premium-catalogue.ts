import type Stripe from "stripe";
import { PREMIUM_PRICING, annualSavingsPercent } from "../shared/premium-pricing";

type PricingClient = Pick<Stripe, "products" | "prices">;

// Only maintain the test catalogue. Existing subscriptions are never modified.
export async function updatePremiumCatalogue(stripe: PricingClient) {
  const existing = await stripe.products.search({
    query: "name:'FallonYou Premium'", limit: 100,
  });
  if (existing.data.length > 1) throw new Error("Multiple Premium products; choose one before updating prices");
  let product = existing.data[0];
  if (!product) {
    product = await stripe.products.create({
      name: "FallonYou Premium",
      description: "Unlock unlimited likes and see who liked your profile. Find your perfect match faster!",
      metadata: { app: "fallonyou", type: "subscription", benefits: "unlimited_likes,see_who_liked_you" },
    }, { idempotencyKey: "fallonyou-premium-test-product" });
  }
  if (product.livemode || !product.active) {
    throw new Error("This script requires an active test-mode Premium product");
  }
  const existingPrices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  if (existingPrices.has_more) throw new Error("Catalogue pagination required before updating prices");
  const targets: { interval: "month" | "year"; amount: number; plan: string }[] = [
    { interval: "month", amount: PREMIUM_PRICING.monthlyCents, plan: "monthly" },
    { interval: "year", amount: PREMIUM_PRICING.yearlyCents, plan: "yearly" },
  ];
  const selected: Stripe.Price[] = [];
  // Create both replacement prices before retiring either previous price.
  for (const target of targets) {
    const match = existingPrices.data.find(price =>
      price.currency === PREMIUM_PRICING.currency && price.unit_amount === target.amount &&
      price.recurring?.interval === target.interval && price.recurring.interval_count === 1);
    const previous = existingPrices.data.find(price =>
      price.currency === PREMIUM_PRICING.currency && price.recurring?.interval === target.interval &&
      price.recurring.interval_count === 1);
    selected.push(match ?? await stripe.prices.create({
      product: product.id, currency: PREMIUM_PRICING.currency, unit_amount: target.amount,
      recurring: { interval: target.interval },
      tax_behavior: previous?.tax_behavior ?? "unspecified",
      metadata: {
        plan: target.plan,
        ...(target.interval === "year" ? {
          savings: `${annualSavingsPercent(PREMIUM_PRICING.monthlyCents, PREMIUM_PRICING.yearlyCents)}%`,
        } : {}),
      },
    }, { idempotencyKey: `fallonyou-${product.id}-${target.interval}-${target.amount}-eur` }));
  }
  if (product.default_price !== selected[0].id) {
    await stripe.products.update(product.id, { default_price: selected[0].id });
  }
  for (const old of existingPrices.data) {
    if (old.currency === PREMIUM_PRICING.currency && old.recurring?.interval_count === 1 &&
        ["month", "year"].includes(old.recurring.interval) && !selected.some(price => price.id === old.id)) {
      // Archiving blocks new purchases at old prices, without changing renewals.
      await stripe.prices.update(old.id, { active: false });
    }
  }
  return { productId: product.id, prices: selected.map(price => ({
    id: price.id, amount: price.unit_amount, currency: price.currency,
    interval: price.recurring?.interval, live: price.livemode,
  })) };
}
