import assert from "node:assert/strict";
import { test } from "node:test";
import { courseLanguages, courseLevels } from "@shared/language-course";
import { advancedLanguageLessons } from "../client/src/lib/advanced-language-lessons";
import { languagePageCopy } from "../client/src/lib/language-profile-copy";

test("C1/C2 have five distinct real study and quiz phrases per lesson in all eleven target languages", () => {
  for (const language of courseLanguages) {
    for (const level of courseLevels.slice(4)) {
      for (const lesson of level.lessons) {
        const phrases = advancedLanguageLessons[language][lesson.id as keyof typeof advancedLanguageLessons.en];
        assert.equal(phrases.length, 5, `${language}/${lesson.id}`);
        assert.equal(new Set(phrases.map(phrase => phrase.phrase)).size, 5);
        assert.equal(new Set(phrases.map(phrase => phrase.translation)).size, 5);
        for (const phrase of phrases) {
          assert(phrase.phrase.trim() && phrase.phonetic.trim() && phrase.translation.trim());
          if (language !== "en") {
            assert(!advancedLanguageLessons.en[lesson.id as keyof typeof advancedLanguageLessons.en]
              .some(english => english.phrase === phrase.phrase), `${language}/${lesson.id} must not fall back to English`);
          }
        }
      }
    }
  }
});
test("all four interface languages describe every new level and lesson and expose recovery copy", () => {
  for (const locale of ["en", "es", "fr", "sv"] as const) {
    const copy = languagePageCopy[locale];
    for (const level of courseLevels.slice(4)) {
      const labels = copy.levels[level.id as "c1" | "c2"];
      assert(labels.title.trim() && labels.description.trim());
      for (const lesson of level.lessons) assert(labels.lessons[lesson.id]?.trim());
    }
    assert(copy.courseLoading && copy.courseLoadError && copy.courseRetry && copy.courseContentUnavailable);
  }
});
