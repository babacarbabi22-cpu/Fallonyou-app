import { courseLanguages } from "./language-course";
import { writingChallenges } from "./writing-challenges";

export const writingLevels = [
  { id: "starter", premium: false, mode: "word" },
  { id: "builder", premium: true, mode: "words" },
  { id: "challenge", premium: true, mode: "memory" },
] as const;
export type WritingLevelId = typeof writingLevels[number]["id"];
export type WritingMode = typeof writingLevels[number]["mode"];
export type WritingLanguage = typeof courseLanguages[number];

// Guided practice only: these stages do not award CEFR course completion.
const phrases: Record<WritingLanguage, string[]> = {
  en: ["I would like a table near the window.", "Could you tell me where the station is?", "We are planning to visit the museum tomorrow.", "If the train is delayed, we will take the bus."],
  es: ["Quisiera una mesa cerca de la ventana.", "¿Podría decirme dónde está la estación?", "Estamos planeando visitar el museo mañana.", "Si el tren se retrasa, tomaremos el autobús."],
  fr: ["Je voudrais une table près de la fenêtre.", "Pourriez-vous me dire où se trouve la gare ?", "Nous prévoyons de visiter le musée demain.", "Si le train a du retard, nous prendrons le bus."],
  it: ["Vorrei un tavolo vicino alla finestra.", "Potrebbe dirmi dove si trova la stazione?", "Abbiamo intenzione di visitare il museo domani.", "Se il treno è in ritardo, prenderemo l'autobus."],
  pt: ["Gostaria de uma mesa perto da janela.", "Poderia dizer-me onde fica a estação?", "Estamos a planear visitar o museu amanhã.", "Se o comboio se atrasar, vamos apanhar o autocarro."],
  de: ["Ich hätte gern einen Tisch am Fenster.", "Könnten Sie mir sagen, wo der Bahnhof ist?", "Wir planen, morgen das Museum zu besuchen.", "Wenn der Zug Verspätung hat, nehmen wir den Bus."],
  ja: ["窓の近くの席をお願いします。", "駅がどこにあるか教えていただけますか。", "明日は博物館を訪れる予定です。", "電車が遅れたら、バスに乗ります。"],
  zh: ["我想要一张靠窗的桌子。", "请问火车站在哪里？", "我们计划明天参观博物馆。", "如果火车晚点，我们就坐公共汽车。"],
  ar: ["أريد طاولة بالقرب من النافذة.", "هل يمكنك أن تخبرني أين تقع المحطة؟", "نخطط لزيارة المتحف غدًا.", "إذا تأخر القطار، فسنستقل الحافلة."],
  nl: ["Ik wil graag een tafel bij het raam.", "Kunt u mij vertellen waar het station is?", "We zijn van plan om morgen het museum te bezoeken.", "Als de trein vertraging heeft, nemen we de bus."],
  sv: ["Jag skulle vilja ha ett bord vid fönstret.", "Kan du berätta var stationen ligger?", "Vi planerar att besöka museet i morgon.", "Om tåget är försenat tar vi bussen."],
};

export function normalizeWriting(value: string, language: string): string {
  return value.normalize("NFC").replace(/[’‘]/g, "'")
    .trim().replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, "")
    .replace(/\s+/g, " ").toLocaleLowerCase(language);
}

export function checkWritingAnswer(input: string, answer: string, language: string): "empty" | "correct" | "marks" | "incorrect" {
  const typed = normalizeWriting(input, language);
  const expected = normalizeWriting(answer, language);
  if (!typed) return "empty";
  if (typed === expected) return "correct";
  const withoutMarks = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "");
  return withoutMarks(typed) === withoutMarks(expected) ? "marks" : "incorrect";
}

export function writingLessonId(level: WritingLevelId) {
  return `writing:${level}`;
}

export function canPracticeWriting(levelId: string, completed: ReadonlySet<string>, premium: boolean) {
  const rank = writingLevels.findIndex(level => level.id === levelId);
  return rank >= 0 && (!writingLevels[rank].premium || premium) &&
    writingLevels.slice(0, rank).every(level => completed.has(writingLessonId(level.id)));
}

export function getWritingExercises(language: WritingLanguage, levelId: WritingLevelId) {
  const level = writingLevels.find(item => item.id === levelId)!;
  const stagePhrases = level.mode === "memory" ? writingChallenges[language] : phrases[language];
  return stagePhrases.map((phrase, index) => {
    if (level.mode === "memory") return {
      id: `${levelId}-${index}`, prompt: phrase, answer: phrase, phrase, phonetic: "", mode: level.mode,
    };
    const words = Array.from(new Intl.Segmenter(language, { granularity: "word" }).segment(phrase))
      .filter(word => word.isWordLike);
    const count = level.mode === "word" ? 1 : Math.max(2, Math.ceil(words.length / 2));
    const start = index % Math.max(1, words.length - count + 1);
    const selected = words.slice(start, start + count);
    let prompt = phrase;
    for (const word of [...selected].reverse()) {
      prompt = prompt.slice(0, word.index) + "____" + prompt.slice(word.index + word.segment.length);
    }
    return {
      id: `${levelId}-${index}`, prompt, answer: selected.map(word => word.segment).join(" "),
      phrase, phonetic: "", mode: level.mode,
    };
  });
}
