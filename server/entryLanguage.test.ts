import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { termsCommunityCopy } from "../client/src/lib/terms-community-copy";
import { onboardingWelcomeCopy } from "../client/src/lib/onboarding-welcome-copy";
import { contentLicenseCopy } from "../client/src/lib/content-license";

test("community terms and onboarding welcome copy cover all four supported languages", () => {
  for (const language of ["en", "es", "fr", "sv"] as const) {
    const terms = termsCommunityCopy[language], welcome = onboardingWelcomeCopy[language];
    assert.deepEqual(Object.keys(terms).sort(), Object.keys(termsCommunityCopy.en).sort());
    assert.deepEqual(Object.keys(welcome).sort(), Object.keys(onboardingWelcomeCopy.en).sort());
    assert.equal(terms.sections.length, 6);
    for (const section of terms.sections) { assert(section.title.trim()); assert(section.body.trim()); }
    assert(terms.confirmation.includes("18"));
    assert(terms.enter.trim()); assert(terms.saving.trim());
    assert(contentLicenseCopy[language].checkbox.trim());
    for (const text of Object.values(welcome)) assert(text.trim());
  }
});

test("terms language switching never accepts terms or changes consent version implicitly", () => {
  const source = readFileSync("client/src/components/TermsModal.tsx", "utf8");
  assert(source.includes("<LanguageSelector showLabel />"));
  assert(source.includes("termsCommunityCopy[language]"));
  assert(source.includes("contentLicenseCopy[language]"));
  assert(source.includes("termsVersion: CURRENT_TERMS_VERSION"));
  assert(source.includes("contentLicenseAccepted: true"));
  assert(source.includes("disabled={!accepted || mutation.isPending}"));
  assert(source.includes('const [accepted, setAccepted] = useState(false)'));
  assert(source.includes("ui_lang=${language}"));
  assert(!source.includes('mutation.isPending ? "Guardando..."'));
});

test("all onboarding branches and age confirmation expose the existing language picker", () => {
  const onboarding = readFileSync("client/src/pages/OnboardingPage.tsx", "utf8");
  assert.equal(onboarding.split("<LanguageSelector showLabel />").length - 1, 2);
  assert(onboarding.includes("onboardingWelcomeCopy[language]"));
  assert(!onboarding.includes("Conecta con viajeros<br"));
  const app = readFileSync("client/src/App.tsx", "utf8");
  const ageGate = app.slice(app.indexOf("function AgeConfirmationModal"), app.indexOf("function SessionPing"));
  assert(ageGate.includes("<LanguageSelector showLabel />"));
  assert(app.includes("Component !== ProfilePage && <AppLanguageControl />"));
  assert(app.includes("PublicPageWithLanguage component={LegalPage}"));
  assert(app.includes("PublicPageWithLanguage component={SupportPage}"));
  assert(app.includes("PublicPageWithLanguage component={DeleteAccountPage}"));
});

test("language button cannot submit forms; existing preference and form state are preserved", () => {
  const picker = readFileSync("client/src/components/LanguageSelector.tsx", "utf8");
  assert(picker.includes('type="button"'));
  assert(picker.includes("onSelect={() => setLanguage(lang)}"));
  assert(picker.includes('showLabel ? "" : "hidden sm:inline"'));
  assert(!picker.includes("window.location"));
  const provider = readFileSync("client/src/lib/i18n.tsx", "utf8");
  assert(provider.includes('setStoredValue(LANGUAGE_STORAGE_KEY, lang)'));
  assert(provider.includes('document.documentElement.lang = language'));
  const global = readFileSync("client/src/components/AppLanguageControl.tsx", "utf8");
  assert(global.includes("createPortal(control, document.body)"));
  assert(global.includes("safe-area-inset-bottom"));
});
