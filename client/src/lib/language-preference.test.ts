import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DEFAULT_LANGUAGE, resolveInitialLanguage } from "./language-preference";
import { getStoredValue } from "./safe-storage";
import { authPageCopy } from "./auth-page-copy";

test("new visitors and unsupported saved preferences use English", () => {
  assert.equal(DEFAULT_LANGUAGE, "en");
  for (const saved of [null, "", "de", "es-ES", "undefined"]) {
    assert.equal(resolveInitialLanguage(saved), "en");
  }
});

test("explicit language choices remain respected for all four supported locales", () => {
  for (const language of ["en", "es", "fr", "sv"]) {
    assert.equal(resolveInitialLanguage(language), language);
  }
});

test("unavailable browser storage still defaults to English", () => {
  assert.equal(resolveInitialLanguage(getStoredValue("fallonyou_language")), "en");
});

test("entry provider uses the preference resolver without choosing the browser locale", async () => {
  const source = await readFile(new URL("./i18n.tsx", import.meta.url), "utf8");
  assert.match(source, /resolveInitialLanguage\(\s*storedLanguage\s*\)/);
  assert.ok(!source.includes("navigator.language"));
});

test("public page and install metadata consistently declare English", async () => {
  const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const manifest = JSON.parse(await readFile(new URL("../../public/manifest.json", import.meta.url), "utf8"));
  assert.match(html, /<html lang="en">/);
  assert.match(html, /property="og:locale" content="en_US"/);
  assert.equal(manifest.lang, "en");
});

test("signup's standalone copy is complete in every supported language", () => {
  function checkValues(value: unknown) {
    if (typeof value === "string") assert.ok(value.trim());
    else for (const nested of Object.values(value as Record<string, unknown>)) checkValues(nested);
  }
  for (const language of ["en", "es", "fr", "sv"] as const) checkValues(authPageCopy[language]);
});

test("localizing signup preserves versioned content consent", async () => {
  const source = await readFile(new URL("../pages/AuthPage.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("license.registrationConsent"));
  assert.ok(source.includes("termsVersion: CURRENT_TERMS_VERSION"));
  assert.ok(source.includes("contentLicenseAccepted: ageConfirmed"));
  assert.ok(source.includes("copy.genericFailure"));
  assert.ok(!source.includes('placeholder="Tu nombre"'));
});