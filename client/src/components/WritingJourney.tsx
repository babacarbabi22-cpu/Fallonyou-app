import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, Check, Crown, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import WritingPractice from "@/components/WritingPractice";
import { writingJourneyCopy } from "@/lib/writing-journey-copy";
import type { WritingExercise } from "@/lib/writing-practice";

type LevelId = "starter" | "builder" | "challenge";
type JourneyLevel = { id: LevelId; premium: boolean; completed: boolean; unlocked: boolean };
type JourneyResponse = { levels: JourneyLevel[]; isPremium: boolean };
type JourneyExercise = WritingExercise & { mode: "word" | "words" | "memory" };
type ExercisesResponse = { exercises: JourneyExercise[] };
const orderedLevels: LevelId[] = ["starter", "builder", "challenge"];

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export default function WritingJourney({ languageCode, languageName }: { languageCode: string; languageName: string }) {
  const { language } = useI18n();
  const copy = writingJourneyCopy[language];
  const queryClient = useQueryClient();
  const [activeLevel, setActiveLevel] = useState<LevelId | null>(null);
  const levelsKey = useMemo(() => ["/api/language/writing", languageCode], [languageCode]);
  const levelsQuery = useQuery({
    queryKey: levelsKey,
    queryFn: () => getJson<JourneyResponse>(`/api/language/writing/${encodeURIComponent(languageCode)}`),
    retry: 2,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
  const exercisesQuery = useQuery({
    queryKey: ["/api/language/writing", languageCode, activeLevel],
    queryFn: () => getJson<ExercisesResponse>(`/api/language/writing/${encodeURIComponent(languageCode)}/${activeLevel}`),
    enabled: !!activeLevel,
    retry: 2,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const levels = levelsQuery.data?.levels ?? [];
  const current = activeLevel ? levels.find(level => level.id === activeLevel) : undefined;
  const persistCompletion = async (answers: string[]) => {
    if (!activeLevel) throw new Error("No active writing level");
    await apiRequest("POST", `/api/language/writing/${encodeURIComponent(languageCode)}/${activeLevel}`, { answers });
    await queryClient.invalidateQueries({ queryKey: levelsKey });
  };
  const nextUnlocked = (completedId: LevelId) => {
    void queryClient.invalidateQueries({ queryKey: levelsKey });
    const nextId = orderedLevels[orderedLevels.indexOf(completedId) + 1];
    const next = levels.find(level => level.id === nextId);
    setActiveLevel(next?.unlocked ? nextId : null);
  };

  if (levelsQuery.isPending) {
    return <section className="px-4 pt-4" aria-busy="true"><div className="rounded-3xl border border-amber-200/80 bg-amber-50/70 p-6">
      <div className="h-5 w-44 animate-pulse rounded bg-amber-200/70" />
      <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-amber-100" />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">{orderedLevels.map(level => <div key={level} className="h-28 animate-pulse rounded-2xl bg-white/80" />)}</div>
    </div></section>;
  }
  if (levelsQuery.isError || !levelsQuery.data) {
    return <div className="mx-4 mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-foreground" role="alert">
      <p>{copy.loadError}</p>
      <Button type="button" variant="outline" className="mt-3" onClick={() => void levelsQuery.refetch()}><RefreshCw aria-hidden="true" />{copy.retry}</Button>
    </div>;
  }

  return (
    <section className="px-4 pt-4" data-testid="writing-journey">
      <div className="overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-[#fffaf0] to-orange-50 p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full border border-amber-200 bg-white/75 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-amber-800">{copy.title}</span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-amber-950">{copy.intro}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-amber-900/70">{copy.guideNote}</p>
          </div>
          <Button type="button" variant="outline" className="border-amber-200 bg-white/70 text-amber-900 hover:bg-amber-100" onClick={() => void levelsQuery.refetch()}>
            <RefreshCw aria-hidden="true" />{copy.refresh}
          </Button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {orderedLevels.map((id, index) => {
            const level = levels.find(item => item.id === id);
            if (!level) return null;
            const locked = !level.unlocked;
            const premiumLocked = level.premium && !levelsQuery.data.isPremium;
            return (
              <div key={id} data-testid={`writing-level-${id}`} className={`rounded-2xl border p-4 ${activeLevel === id ? "border-amber-500 bg-white shadow-sm" : "border-amber-200/80 bg-white/70"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">{index + 1}</span>
                    <h3 className="font-semibold text-amber-950">{copy.levels[id]}</h3>
                  </div>
                  {level.completed ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-800"><Check className="h-4 w-4" aria-hidden="true" />{copy.completed}</span>
                    : premiumLocked ? <span className="flex items-center gap-1 text-xs font-semibold text-amber-800"><Crown className="h-4 w-4" aria-hidden="true" />{copy.premium}</span>
                    : locked ? <Lock className="h-4 w-4 text-amber-800/65" aria-label={copy.locked} /> : null}
                </div>
                <p className="mt-3 min-h-10 text-sm leading-relaxed text-amber-900/70">{copy.levelDescriptions[id]}</p>
                {premiumLocked ? (
                  <div className="mt-3">
                    <p className="text-xs leading-relaxed text-amber-900/70">{copy.premiumDescription}</p>
                    <Link href="/premium" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amber-900 underline decoration-amber-400 underline-offset-4">{copy.premium}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                  </div>
                ) : (
                  <Button data-testid={`writing-open-${id}`} type="button" disabled={locked} variant={activeLevel === id ? "default" : "outline"} onClick={() => setActiveLevel(id)} className={`mt-3 w-full ${activeLevel === id ? "bg-amber-800 text-white hover:bg-amber-900" : "border-amber-200 text-amber-900 hover:bg-amber-100"}`}>
                    {locked ? <><Lock aria-hidden="true" />{copy.locked}</> : <>{copy.openLevel}<ArrowRight aria-hidden="true" /></>}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {activeLevel && current?.unlocked && (
          <div className="mt-5 border-t border-amber-200/80 pt-5">
            {exercisesQuery.isPending ? (
              <div className="animate-pulse rounded-2xl bg-white/70 p-6" aria-busy="true"><div className="h-5 w-40 rounded bg-amber-200/70" /><div className="mt-4 h-24 rounded-xl bg-amber-100/70" /></div>
            ) : exercisesQuery.isError ? (
              <div className="rounded-2xl border border-destructive/20 bg-white/80 p-5 text-sm" role="alert">
                <p>{copy.loadError}</p><Button type="button" variant="outline" className="mt-3" onClick={() => void exercisesQuery.refetch()}>{copy.retry}</Button>
              </div>
            ) : exercisesQuery.data?.exercises.length ? (
              <WritingPractice
                key={`journey-${languageCode}-${activeLevel}`}
                exercises={exercisesQuery.data.exercises}
                targetLanguage={languageCode}
                languageName={languageName}
                onComplete={persistCompletion}
                hidePhonetic
                guided
                completionTitle={copy.completed}
                completionDescription={copy.savedDescription}
                savingLabel={copy.saving}
                saveErrorLabel={copy.saveError}
                onContinue={() => nextUnlocked(activeLevel)}
                continueLabel={copy.continue}
                onRefresh={() => void levelsQuery.refetch()}
                refreshLabel={copy.refresh}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-300 bg-white/60 px-5 py-8 text-center text-sm text-amber-900/75">{copy.empty}</div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
