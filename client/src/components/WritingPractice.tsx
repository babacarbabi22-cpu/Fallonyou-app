import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight, Check, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkWritingAnswer, type WritingExercise } from "@/lib/writing-practice";
import { writingPracticeCopy } from "@/lib/writing-practice-copy";
import { writingJourneyCopy } from "@/lib/writing-journey-copy";
import { useI18n } from "@/lib/i18n";
import { playLearningFeedback } from "@/lib/learning-sounds";

type PracticeExercise = WritingExercise & { mode?: "word" | "words" | "memory" };
type AnswerResult = "empty" | "correct" | "marks" | "incorrect";
type WritingPracticeProps = {
  exercises: PracticeExercise[];
  targetLanguage: string;
  languageName: string;
  onComplete?: (answers: string[]) => Promise<void>;
  hidePhonetic?: boolean;
  guided?: boolean;
  completionTitle?: string;
  completionDescription?: string;
  savingLabel?: string;
  saveErrorLabel?: string;
  onContinue?: () => void;
  continueLabel?: string;
  onRefresh?: () => void;
  refreshLabel?: string;
};

export default function WritingPractice({
  exercises,
  targetLanguage,
  languageName,
  onComplete,
  hidePhonetic = false,
  guided = false,
  completionTitle,
  completionDescription,
  savingLabel,
  saveErrorLabel,
  onContinue,
  continueLabel,
  onRefresh,
  refreshLabel,
}: WritingPracticeProps) {
  const { language } = useI18n();
  const copy = writingPracticeCopy[language] ?? writingPracticeCopy.en;
  const journeyCopy = writingJourneyCopy[language];
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [complete, setComplete] = useState(false);
  const [composing, setComposing] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [memoryStarted, setMemoryStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const exercise = exercises[index];
  const mode = exercise?.mode ?? "word";
  const memoryStudy = mode === "memory" && !memoryStarted;
  const isSpeechAvailable =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined";

  const checkAnswer = () => {
    if (!exercise || !value.trim() || result === "correct") return;
    const checked = checkWritingAnswer(value, exercise.answer, targetLanguage);
    setResult(checked === "empty" ? "incorrect" : checked);
    void playLearningFeedback(checked === "correct" ? "correct" : "incorrect");
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!composing) checkAnswer();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && (composing || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) {
      event.preventDefault();
    }
  };
  const retry = () => {
    setValue("");
    setResult(null);
    setSaveError(false);
    if (mode === "memory") setMemoryStarted(false);
  };
  const saveCompletion = async (collected: string[]) => {
    if (!onComplete) {
      setComplete(true);
      void playLearningFeedback("complete");
      return;
    }
    setSaving(true);
    setSaveError(false);
    try {
      await onComplete(collected);
      setComplete(true);
      void playLearningFeedback("complete");
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };
  const next = () => {
    if (result !== "correct") return;
    const collected = [...answers];
    collected[index] = value;
    setAnswers(collected);
    setSaveError(false);
    if (index === exercises.length - 1) {
      void saveCompletion(collected);
      return;
    }
    setIndex(current => current + 1);
    setValue("");
    setResult(null);
    setMemoryStarted(false);
  };
  const restart = () => {
    setIndex(0);
    setValue("");
    setResult(null);
    setComplete(false);
    setAnswers([]);
    setMemoryStarted(false);
    setSaving(false);
    setSaveError(false);
  };
  const listen = () => {
    if (!exercise || !isSpeechAvailable) return;
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(exercise.phrase);
    const code = targetLanguage.toLowerCase().split("-")[0];
    utterance.lang =
      code === "zh" ? "zh-CN" :
      code === "ja" ? "ja-JP" :
      code === "ar" ? "ar-SA" :
      code === "pt" ? "pt-BR" :
      targetLanguage;
    window.speechSynthesis.speak(utterance);
  };
  const instructions = mode === "words"
    ? journeyCopy.wordsInstructions
    : mode === "memory"
      ? journeyCopy.memoryInstructions
      : copy.instructions.replace("{language}", languageName);
  const feedbackText =
    result === "correct" ? copy.correct :
    result === "marks" ? copy.marks :
    result === "incorrect" ? copy.incorrect :
    "";

  return (
    <section data-testid="writing-practice" className="relative overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-[#fffaf0] to-orange-50 p-5 shadow-sm sm:p-7">
      <div className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full border-[28px] border-amber-100/55" />
      <div className="relative">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-800">{copy.tab}</span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-amber-950 sm:text-[1.75rem]">{copy.title}</h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-amber-900/70">{instructions}</p>
          </div>
          {exercises.length > 0 && !complete && <span className="shrink-0 rounded-full bg-amber-100/80 px-3 py-1.5 text-xs font-semibold text-amber-900">{copy.progress(index + 1, exercises.length)}</span>}
        </div>

        {!exercises.length ? (
          <div className="rounded-2xl border border-dashed border-amber-300 bg-white/60 px-5 py-8 text-center text-sm leading-relaxed text-amber-900/75">{copy.empty}</div>
        ) : complete ? (
          <div data-testid="writing-complete" className="rounded-2xl border border-amber-200 bg-white/75 px-5 py-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800"><Check className="h-6 w-6" aria-hidden="true" /></span>
            <h3 className="mt-4 text-lg font-semibold text-amber-950">{completionTitle ?? copy.completed}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-amber-900/70">
              {(completionDescription ?? (guided ? copy.completedDescription : copy.completedDescription)).replace("{n}", String(exercises.length))}
            </p>
            {onContinue && <Button type="button" onClick={onContinue} className="mt-5 bg-amber-800 text-white hover:bg-amber-900">{continueLabel ?? copy.next}<ArrowRight aria-hidden="true" /></Button>}
            {onRefresh && <Button type="button" onClick={onRefresh} variant="outline" className="mt-3 border-amber-300 text-amber-900 hover:bg-amber-50"><RotateCcw aria-hidden="true" />{refreshLabel ?? copy.retry}</Button>}
            <Button type="button" onClick={restart} variant={onContinue ? "outline" : "default"} className={onContinue ? "mt-3 border-amber-300 text-amber-900 hover:bg-amber-50" : "mt-5 bg-amber-800 text-white hover:bg-amber-900"} data-testid="writing-restart">
              <RotateCcw aria-hidden="true" />{copy.restart}
            </Button>
          </div>
        ) : exercise ? (
          <div className="rounded-2xl border border-amber-200/90 bg-white/80 p-4 shadow-[0_8px_24px_-20px_rgba(120,53,15,0.5)] sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800/75">
                {mode === "words" ? journeyCopy.wordsInstructions : mode === "memory" ? journeyCopy.studyTitle : copy.missingWord}
              </p>
              {isSpeechAvailable && (mode !== "memory" || memoryStudy) && (
                <Button type="button" variant="outline" size="sm" onClick={listen} aria-label={copy.listen} data-testid="writing-listen" className="border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100">
                  <Volume2 aria-hidden="true" /><span className="hidden sm:inline">{copy.listen}</span>
                </Button>
              )}
            </div>

            {memoryStudy ? (
              <div className="rounded-xl bg-amber-50/80 px-4 py-5 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800/75">{journeyCopy.studyTitle}</p>
                <p lang={targetLanguage} dir="auto" className="mt-3 break-words text-[1.45rem] font-medium leading-relaxed text-amber-950 sm:text-3xl">{exercise.phrase}</p>
                {!hidePhonetic && exercise.phonetic && <p className="mt-2 text-xs text-amber-900/70"><span className="font-semibold">{copy.pronunciation}: </span><bdi>{exercise.phonetic}</bdi></p>}
                <Button data-testid="writing-memory-start" type="button" onClick={() => setMemoryStarted(true)} className="mt-5 bg-amber-800 text-white hover:bg-amber-900">{journeyCopy.startMemory}<ArrowRight aria-hidden="true" /></Button>
              </div>
            ) : (
              <>
                {mode !== "memory" && <p lang={targetLanguage} dir="auto" data-testid="writing-prompt" className="min-h-16 break-words text-center font-medium text-amber-950 text-[1.45rem] leading-relaxed sm:text-3xl">{exercise.prompt}</p>}
                {!hidePhonetic && mode !== "memory" && exercise.phonetic && (
                  <p className="mt-2 text-center text-xs leading-relaxed text-amber-900/70"><span className="font-semibold">{copy.pronunciation}: </span><bdi>{exercise.phonetic}</bdi></p>
                )}
                <form onSubmit={handleSubmit} className="mx-auto mt-6 max-w-lg">
                  <label htmlFor="writing-answer" className="sr-only">{mode === "words" ? journeyCopy.wordsInstructions : copy.missingWord}</label>
                  <Input id="writing-answer" data-testid="writing-input" value={value} onChange={event => setValue(event.target.value)} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onKeyDown={handleKeyDown} lang={targetLanguage} dir="auto" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder={copy.placeholder} disabled={result === "correct" || saving} className="h-12 rounded-xl border-amber-300 bg-[#fffdf8] px-4 text-base text-amber-950 placeholder:text-amber-900/40 focus-visible:ring-amber-600" />
                  <div data-testid="writing-feedback" aria-live="polite" aria-atomic="true" className={`mt-3 overflow-hidden transition-all duration-200 ${result ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}>
                    {result && <div className={`rounded-xl px-4 py-3 text-sm ${result === "correct" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-950"}`}>
                      <p className="font-medium">{feedbackText}</p>
                      {(result === "incorrect" || result === "marks") && <p className="mt-1.5 text-amber-900/75"><span className="font-semibold">{copy.expected}: </span><bdi lang={targetLanguage} dir="auto" className="font-semibold text-amber-950">{exercise.answer}</bdi></p>}
                    </div>}
                  </div>
                  {saveError && <p className="mt-3 rounded-xl bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">{saveErrorLabel ?? copy.incorrect}</p>}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {saving ? (
                      <Button type="button" disabled className="bg-amber-800 text-white"><span className="h-4 w-4 animate-pulse rounded-full bg-white/70" />{savingLabel ?? copy.check}</Button>
                    ) : saveError ? (
                      <Button type="button" onClick={() => void saveCompletion(answers)} className="bg-amber-800 text-white hover:bg-amber-900"><RotateCcw aria-hidden="true" />{copy.retry}</Button>
                    ) : result === "correct" ? (
                      <Button type="button" onClick={next} className="bg-amber-800 text-white hover:bg-amber-900" data-testid="writing-next">{index === exercises.length - 1 ? copy.finish : copy.next}<ArrowRight aria-hidden="true" /></Button>
                    ) : result === "incorrect" || result === "marks" ? (
                      <Button type="button" variant="outline" onClick={retry} className="border-amber-300 text-amber-900 hover:bg-amber-50" data-testid="writing-retry"><RotateCcw aria-hidden="true" />{copy.retry}</Button>
                    ) : (
                      <Button type="submit" disabled={!value.trim() || composing} className="bg-amber-800 text-white hover:bg-amber-900" data-testid="writing-check">{copy.check}<Check aria-hidden="true" /></Button>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
