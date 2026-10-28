export type WritingPhrase = { phrase: string; phonetic: string };
export type WritingExercise = {
  id: string;
  prompt: string;
  answer: string;
  phrase: string;
  phonetic: string;
  mode?: "word" | "words" | "memory";
};

export function createWritingExercises(phrases: WritingPhrase[], language: string): WritingExercise[] {
  return phrases.flatMap((phrase, index) => {
    let words: Array<{ segment: string; index: number }>;
    if (typeof Intl.Segmenter === "function") {
      words = Array.from(new Intl.Segmenter(language, { granularity: "word" }).segment(phrase.phrase))
        .filter(part => part.isWordLike);
    } else {
      words = Array.from(phrase.phrase.matchAll(/[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu))
        .map(match => ({ segment: match[0], index: match.index! }));
    }
    if (!words.length) return [];
    const word = words[index % words.length];
    return [{
      id: `${language}-${index}`,
      prompt: phrase.phrase.slice(0, word.index) + "____" + phrase.phrase.slice(word.index + word.segment.length),
      answer: word.segment,
      phrase: phrase.phrase,
      phonetic: phrase.phonetic,
    }];
  });
}

export { checkWritingAnswer } from "@shared/writing-course";