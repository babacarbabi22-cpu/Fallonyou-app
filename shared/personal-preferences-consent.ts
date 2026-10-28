export const PERSONAL_PREFERENCES_CONSENT_VERSION = "2026-10-02";
export class PersonalPreferencesConsentError extends Error {}
export function hasPersonalPreferencesConsent(profile: {
  personalPreferencesConsentAt?: Date | string | null;
  personalPreferencesConsentVersion?: string | null;
} | null | undefined): boolean {
  return profile?.personalPreferencesConsentVersion === PERSONAL_PREFERENCES_CONSENT_VERSION &&
    !!profile.personalPreferencesConsentAt &&
    Number.isFinite(new Date(profile.personalPreferencesConsentAt).getTime());
}
export const LEGACY_SENSITIVE_FIELDS = ["religion", "politics", "relationshipType"] as const;
export function validatePersonalPreferencesPatch(
  body: Record<string, unknown>,
  profile: Parameters<typeof hasPersonalPreferencesConsent>[0],
  restrictedFilter = false,
) {
  for (const field of LEGACY_SENSITIVE_FIELDS) {
    if (body[field] !== undefined && body[field] !== null && body[field] !== "") {
      throw new PersonalPreferencesConsentError("These legacy sensitive fields are no longer collected");
    }
  }
  const consent = body.personalPreferencesConsent;
  if (consent !== undefined && typeof consent !== "boolean") throw new PersonalPreferencesConsentError("Invalid personal preferences consent");
  if (consent === true && body.personalPreferencesConsentVersion !== PERSONAL_PREFERENCES_CONSENT_VERSION) {
    throw new PersonalPreferencesConsentError("Accept the current personal preferences notice");
  }
  if (body.preference !== undefined && body.preference !== null &&
      !["", "men", "women", "both", "everyone"].includes(body.preference as string)) throw new PersonalPreferencesConsentError("Invalid personal preference");
  const requested = (typeof body.preference === "string" && !["", "everyone"].includes(body.preference)) || restrictedFilter;
  if (requested && consent !== false && consent !== true && !hasPersonalPreferencesConsent(profile)) {
    throw new PersonalPreferencesConsentError("Optional personal preferences require explicit consent");
  }
}