export function canReadVerificationSelfie(
  viewer: { isAdmin: string | null; isBanned: string | null } | undefined,
  viewerId: string,
  ownerIds: string[],
): boolean {
  return !!viewer && viewer.isBanned !== "true" &&
    (viewer.isAdmin === "true" || ownerIds.includes(viewerId));
}