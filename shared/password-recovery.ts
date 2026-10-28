export const RESET_PASSWORD_MIN_LENGTH = 6;
export const RESET_PASSWORD_MAX_BYTES = 72; // bcrypt's input limit

export function isPasswordResetToken(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

export function passwordRecoveryValidation(value: unknown): "INVALID_PASSWORD" | "PASSWORD_TOO_LONG" | undefined {
  if (typeof value !== "string" || value.length < RESET_PASSWORD_MIN_LENGTH) return "INVALID_PASSWORD";
  if (new TextEncoder().encode(value).length > RESET_PASSWORD_MAX_BYTES) return "PASSWORD_TOO_LONG";
}
