import test from "node:test";
import assert from "node:assert/strict";
import { hasPersonalPreferencesConsent, validatePersonalPreferencesPatch, PERSONAL_PREFERENCES_CONSENT_VERSION as version } from "../shared/personal-preferences-consent";
import { publicProfileColumns, toCurrentProfile, toPublicProfile } from "./publicUser";

const granted = { personalPreferencesConsentAt: new Date("2026-10-02T12:00:00Z"), personalPreferencesConsentVersion: version };
test("consent needs both a valid date and the current notice, never a legacy flag", () => {
  for (const profile of [null, {}, { personalPreferencesConsentAt: "bad", personalPreferencesConsentVersion: version },
    { ...granted, personalPreferencesConsentVersion: "old" }]) assert.equal(hasPersonalPreferencesConsent(profile), false);
  assert.equal(hasPersonalPreferencesConsent(granted), true);
});
test("personal preferences and restricted discovery filters cannot bypass explicit consent", () => {
  assert.throws(() => validatePersonalPreferencesPatch({ preference: "women" }, null));
  assert.throws(() => validatePersonalPreferencesPatch({}, null, true));
  assert.throws(() => validatePersonalPreferencesPatch({ personalPreferencesConsent: "true" }, null));
  assert.throws(() => validatePersonalPreferencesPatch({ personalPreferencesConsent: true, personalPreferencesConsentVersion: "old" }, null));
  assert.doesNotThrow(() => validatePersonalPreferencesPatch({ preference: "everyone" }, null));
  assert.doesNotThrow(() => validatePersonalPreferencesPatch({ preference: "men" }, granted));
  assert.doesNotThrow(() => validatePersonalPreferencesPatch({ preference: "women", personalPreferencesConsent: true, personalPreferencesConsentVersion: version }, null));
  assert.doesNotThrow(() => validatePersonalPreferencesPatch({ personalPreferencesConsent: false }, granted));
  assert.throws(() => validatePersonalPreferencesPatch({ preference: "women" }, { ...granted, personalPreferencesConsentAt: null }));
});
test("legacy sensitive values can be cleared but no longer supplied or disclosed", () => {
  for (const field of ["religion", "politics", "relationshipType"]) {
    assert.throws(() => validatePersonalPreferencesPatch({ [field]: "fictional-value" }, granted));
    assert.doesNotThrow(() => validatePersonalPreferencesPatch({ [field]: null }, null));
    assert.ok(!(field in publicProfileColumns));
  }
  const profile = { ...granted, preference: "women", religion: "fictional-religion", politics: "fictional-politics", relationshipType: "fictional-type" };
  const publicProfile = toPublicProfile(profile);
  for (const field of Object.keys(profile)) assert.ok(!(field in publicProfile!));
  assert.equal(toCurrentProfile(profile)?.religion, "fictional-religion");
  assert.equal(toCurrentProfile(profile)?.personalPreferencesConsentVersion, version);
});