function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function isAccountIdentity(value: unknown): boolean {
  return isRecord(value) && typeof value.id === "string" && value.id.trim().length > 0 &&
    typeof value.email === "string" && value.email.trim().length > 0;
}
export function isAccountAuthSuccess(kind: "login" | "register", value: unknown): boolean {
  if (!isRecord(value) || value.success === false) return false;
  return kind === "register" ? value.success === true && isAccountIdentity(value.user) : isAccountIdentity(value);
}
