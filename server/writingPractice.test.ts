import { test } from "node:test";
import assert from "node:assert/strict";
import { createWritingExercises, checkWritingAnswer } from "../client/src/lib/writing-practice";
import { writingPracticeCopy } from "../client/src/lib/writing-practice-copy";

test("writing exercises keep the chosen language, including non-Latin scripts", () => {
  const phrases = { en: "Hello!", es: "¡Hola!", fr: "Bonjour !", it: "Ciao!", pt: "Olá!",
    de: "Guten Morgen!", ja: "こんにちは。", zh: "你好！", ar: "مرحبا!", nl: "Goedemorgen!", sv: "Hej!" };
  for (const [language, phrase] of Object.entries(phrases)) {
    const exercises = createWritingExercises([{ phrase, phonetic: "fixture pronunciation" }], language);
    assert.equal(exercises.length, 1, language);
    const exercise = exercises[0];
    assert(exercise.prompt.includes("____"));
    assert.equal(exercise.prompt.replace("____", exercise.answer), phrase);
    assert.equal(checkWritingAnswer(exercise.answer, exercise.answer, language), "correct");
    assert.equal(checkWritingAnswer("fixture pronunciation", exercise.answer, language), "incorrect");
  }
});

test("checking is forgiving about case and punctuation but teaches the correct accents", () => {
  assert.equal(checkWritingAnswer("  HELLO! ", "Hello", "en"), "correct");
  assert.equal(checkWritingAnswer("cafe\u0301", "café", "fr"), "correct");
  assert.equal(checkWritingAnswer("cafe", "café", "fr"), "marks");
  assert.equal(checkWritingAnswer("ar", "är", "sv"), "marks");
  assert.equal(checkWritingAnswer("L’HÔTEL", "l'hôtel", "fr"), "correct");
  assert.equal(checkWritingAnswer("hola", "Hello", "en"), "incorrect");
  assert.equal(checkWritingAnswer("ni hao", "你好", "zh"), "incorrect");
  assert.equal(checkWritingAnswer("مرحبا", "مرحبا", "ar"), "correct");
  assert.equal(checkWritingAnswer("さようなら", "こんにちは", "ja"), "incorrect");
  assert.equal(checkWritingAnswer(" ! ", "Hello", "en"), "empty");
});

test("empty content never silently generates English exercises", () => {
  assert.deepEqual(createWritingExercises([], "ar"), []);
  assert.deepEqual(createWritingExercises([{ phrase: "...", phonetic: "" }], "ja"), []);
});

test("the browser fallback supports writing without Intl.Segmenter", () => {
  const descriptor = Object.getOwnPropertyDescriptor(Intl, "Segmenter")!;
  try {
    Object.defineProperty(Intl, "Segmenter", { value: undefined, configurable: true });
    for (const [language, phrase] of [["fr", "Bonjour l’hôtel !"], ["zh", "你好！"], ["ja", "こんにちは。"], ["ar", "مرحبا يا صديقي"]]) {
      const [exercise] = createWritingExercises([{ phrase, phonetic: "" }], language);
      assert(exercise);
      assert.equal(exercise.prompt.replace("____", exercise.answer), phrase);
    }
  } finally {
    Object.defineProperty(Intl, "Segmenter", descriptor);
  }
});

test("writing practice has complete interface copy in all four app languages", () => {
  const keys = Object.keys(writingPracticeCopy.en).sort();
  for (const language of ["en", "es", "fr", "sv"] as const) {
    const copy = writingPracticeCopy[language];
    assert.deepEqual(Object.keys(copy).sort(), keys);
    for (const value of Object.values(copy)) {
      if (typeof value === "string") assert(value.trim().length > 0);
    }
    assert(copy.instructions.includes("{language}"));
    assert(copy.completedDescription.includes("{n}"));
    assert(copy.progress(1, 4).includes("1"));
    assert(copy.progress(1, 4).includes("4"));
  }
});