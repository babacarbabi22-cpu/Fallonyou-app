import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { translations, type Language } from "./i18n";

const languages: Language[] = ["es", "en", "fr", "sv"];
const keys = [
  "storiesAddStatus", "storiesUploading", "storyMediaLoading", "storyMediaError",
  "storyMediaRetry", "storyMediaSound", "storyPrevious", "storyNext", "storyOwn",
  "storyExpires", "storyAddTitle", "storyCamera", "storyGallery", "storyUnknownName",
  "storyPublished", "storyVisibleDuration", "storyUploadError", "storyDeleteError", "storyFileTooLarge", "storyPhotoOnly",
  "storyDelete", "storyDeleteConfirmTitle", "storyDeleteConfirmDescription", "storyDeleting", "storyDeleted",
] as const;
const own = { es: "Tu historia", en: "Your story", fr: "Ta story", sv: "Din story" };
for (const language of languages) {
  test(`all story states have complete nonempty ${language} copy`, () => {
    const t = translations[language];
    for (const key of keys) assert.ok(t.ui[key]?.trim(), `${language}.${key}`);
    for (const key of ["error", "cancel", "close", "delete"] as const) assert.ok(t.common[key]?.trim());
    assert.equal(t.ui.storyOwn, own[language]);
    assert.match(t.ui.storyFileTooLarge, /50 M[Bo]/);
    if (language !== "en") {
      for (const key of ["storyUploadError", "storyDeleteError", "storyMediaError", "storyMediaSound"] as const) {
        assert.notEqual(t.ui[key], translations.en.ui[key], `${language}.${key} must not use English fallback`);
      }
    }
  });
}
test("story UI uses localized labels, including upload/delete errors and accessibility names", async () => {
  const source = await readFile(new URL("../components/StoriesRow.tsx", import.meta.url), "utf8");
  for (const key of keys.filter(key => !["storyMediaLoading", "storyMediaError", "storyMediaRetry", "storyMediaSound"].includes(key))) {
    assert.ok(source.includes(`t.ui.${key}`), key);
  }
  for (const literal of ["Tu historia", "Caduca en 24h", "Error al borrar historia", "Historia publicada", "Visible durante 24 horas", "Error al subir historia"]) {
    assert.ok(!source.includes(`"${literal}"`), `hardcoded ${literal}`);
  }
  assert.match(source, /aria-label=\{t\.common\.close\}/);
  assert.match(source, /aria-label=\{t\.ui\.storyDelete\}/);
});