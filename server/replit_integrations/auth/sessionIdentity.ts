interface IdentityClaims {
  sub?: unknown;
  email?: unknown;
  first_name?: unknown;
  last_name?: unknown;
}

// Legacy OIDC sessions must still satisfy the application's Passport identity
// contract. Missing mandatory identity claims are errors, not empty users.
export function getSessionIdentity(claims: IdentityClaims | undefined): Express.User {
  if (typeof claims?.sub !== "string" || !claims.sub.trim() ||
      typeof claims.email !== "string" || !claims.email.trim()) {
    throw new Error("Identity provider did not return the required account identity");
  }
  return {
    id: claims.sub,
    email: claims.email,
    firstName: typeof claims.first_name === "string" ? claims.first_name : null,
    lastName: typeof claims.last_name === "string" ? claims.last_name : null,
  };
}