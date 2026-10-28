import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { profileSettingsCopy } from "../client/src/lib/profile-settings-copy";

test("profile verification and notification copy is complete in every supported language", () => {
  const keys = Object.keys(profileSettingsCopy.en).sort();
  for (const language of ["en", "es", "fr", "sv"] as const) {
    const copy = profileSettingsCopy[language];
    assert.deepEqual(Object.keys(copy).sort(), keys);
    for (const [key, value] of Object.entries(copy)) {
      assert.equal(typeof value, "string");
      assert(value.trim().length > 0, `${language}.${key}`);
    }
    assert(/24.*48/.test(copy.pendingDescription));
    assert(/24.*48/.test(copy.sentDescription));
    if (language !== "es") {
      for (const key of ["verificationTitle", "pendingTitle", "rejectedTitle", "submit", "takeSelfie", "retrySelfie", "uploadError"] as const) {
        assert.notEqual(copy[key], profileSettingsCopy.es[key], `${language}.${key} is not Spanish`);
      }
    }
  }
});

test("verification errors use localized copy without exposing server or browser messages", () => {
  const component = readFileSync("client/src/components/VerificationBadge.tsx", "utf8");
  assert(component.includes("description: copy.uploadError"));
  assert(!component.includes("description: err.message"));
  assert(!component.includes("Cuenta verificada"));
  assert(!component.includes("Enviando..."));
  assert(component.includes('capture="user"'));
  assert(component.includes('formData.append("selfie", selectedFile)'));
  assert(component.includes('fetch("/api/verification/submit"'));
  assert(component.includes("{user.verificationRejectedReason}"));
});