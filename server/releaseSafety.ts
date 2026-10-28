// Supplier onboarding has not been confirmed. Credentials alone must not
// reactivate hotels or package sales during store preparation.
export const hotelAndPackageSalesEnabled: boolean = false;

export function stripeCustomerMatches(
  expectedCustomerId: string | null | undefined,
  actualCustomer: unknown,
): boolean {
  const actualId = typeof actualCustomer === "string"
    ? actualCustomer
    : actualCustomer && typeof actualCustomer === "object" && "id" in actualCustomer
      ? (actualCustomer as { id: unknown }).id
      : undefined;
  return typeof expectedCustomerId === "string" &&
    expectedCustomerId.length > 0 && actualId === expectedCustomerId;
}

export function canRateConnection(
  userId: string,
  match: { user1Id: string; user2Id: string; status: string } | undefined,
  blocked: boolean,
): boolean {
  return !!match && !blocked &&
    (match.status === "matched" || match.status === "ended") &&
    (match.user1Id === userId || match.user2Id === userId);
}

export function getValidPremiumExpiry(
  subscription: {
    status: string;
    current_period_end?: number;
    items?: { data: Array<{ current_period_end?: number }> };
  },
  now = Date.now(),
): Date | null {
  if (!["active", "trialing"].includes(subscription.status)) return null;
  const end = subscription.items?.data[0]?.current_period_end ?? subscription.current_period_end;
  if (typeof end !== "number" || !Number.isFinite(end) || end * 1000 <= now) return null;
  const expiry = new Date(end * 1000);
  return Number.isFinite(expiry.getTime()) ? expiry : null;
}