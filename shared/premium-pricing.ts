// Intended catalogue amounts, in cents. These do not enable purchases.
export const PREMIUM_PRICING = Object.freeze({
  currency: "eur",
  monthlyCents: 499,
  yearlyCents: 4999,
});

export function annualSavingsPercent(monthlyCents: number, yearlyCents: number) {
  if (monthlyCents <= 0 || yearlyCents <= 0) return 0;
  // Round down so promotional copy never overstates the discount.
  return Math.max(0, Math.floor((1 - yearlyCents / (12 * monthlyCents)) * 100));
}

export interface PremiumPrice {
  id: string;
  unit_amount: number;
  currency: string;
  recurring?: { interval: string };
}
export interface PremiumProduct {
  id: string;
  name: string;
  prices: PremiumPrice[];
}
export interface PremiumCatalogueRow {
  product_id: string;
  product_name: string;
  price_id: string | null;
  unit_amount: number | null;
  currency: string | null;
  recurring?: { interval: string };
}

// The current catalogue API returns SQL join rows, not nested product.prices.
export function premiumProducts(rows: (PremiumCatalogueRow | PremiumProduct)[]): PremiumProduct[] {
  const products = new Map<string, PremiumProduct>();
  for (const row of rows) {
    if ("prices" in row) {
      products.set(row.id, row);
      continue;
    }
    let product = products.get(row.product_id);
    if (!product) {
      product = { id: row.product_id, name: row.product_name, prices: [] };
      products.set(product.id, product);
    }
    if (row.price_id && row.unit_amount !== null && row.currency) {
      product.prices.push({
        id: row.price_id, unit_amount: row.unit_amount,
        currency: row.currency, recurring: row.recurring,
      });
    }
  }
  return [...products.values()];
}
