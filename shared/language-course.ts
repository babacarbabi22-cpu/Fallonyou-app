// Keep persisted lesson and level IDs stable: b2plus is the existing B2+ course.
export const courseLanguages = ["en", "es", "fr", "it", "pt", "de", "ja", "zh", "ar", "nl", "sv"] as const;
export const courseLevels = [
  { id: "a1", label: "A1", premium: false, lessons: [
    { id: "a1-greetings", category: "greetings" }, { id: "a1-restaurant", category: "restaurant" }, { id: "a1-social", category: "social" },
  ] },
  { id: "a2", label: "A2", premium: false, requiresLevel: "a1", lessons: [
    { id: "a2-airport", category: "airport" }, { id: "a2-transport", category: "transport" }, { id: "a2-hotel", category: "hotel" },
  ] },
  { id: "b1", label: "B1", premium: false, requiresLevel: "a2", lessons: [
    { id: "b1-emergency", category: "emergency" }, { id: "b1-numbers", category: "numbers" }, { id: "b1-shopping", category: "shopping" },
  ] },
  { id: "b2plus", label: "B2+", premium: true, requiresLevel: "b1", lessons: [
    { id: "b2-health", category: "health" }, { id: "b2-business", category: "business" }, { id: "b2-culture", category: "culture" },
  ] },
  { id: "c1", label: "C1", premium: true, requiresLevel: "b2plus", lessons: [
    { id: "c1-negotiation", category: "business" }, { id: "c1-opinions", category: "culture" }, { id: "c1-resolution", category: "social" },
  ] },
  { id: "c2", label: "C2", premium: true, requiresLevel: "c1", lessons: [
    { id: "c2-nuance", category: "culture" }, { id: "c2-debate", category: "business" }, { id: "c2-mediation", category: "social" },
  ] },
] as const;

export const canonicalLessons: Record<string, { level: string; category: string }> =
  Object.fromEntries(courseLevels.flatMap(level => level.lessons.map(lesson => [
    lesson.id, { level: level.id, category: lesson.category },
  ])));

export function hasLanguagePremium(account: { isPremium?: string | boolean | null; trialEndsAt?: Date | string | null } | null | undefined, now = new Date()): boolean {
  return account?.isPremium === true || account?.isPremium === "true" ||
    (!!account?.trialEndsAt && new Date(account.trialEndsAt).getTime() > now.getTime());
}

export function isCourseLevelComplete(levelId: string, completed: ReadonlySet<string>): boolean {
  const level = courseLevels.find(item => item.id === levelId);
  return !!level && level.lessons.every(lesson => completed.has(lesson.id));
}

export function canStudyCourseLevel(levelId: string, completed: ReadonlySet<string>, premium: boolean): boolean {
  const rank = courseLevels.findIndex(level => level.id === levelId);
  return rank >= 0 && (!courseLevels[rank].premium || premium) &&
    courseLevels.slice(0, rank).every(level => isCourseLevelComplete(level.id, completed));
}

export function highestCompletedCourseLevel(rows: Array<{ language: string; lessonId: string }>): {
  level: string; levelLabel: string; language: string;
} | null {
  const languages = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!languages.has(row.language)) languages.set(row.language, new Set());
    languages.get(row.language)!.add(row.lessonId);
  }
  let best: { level: string; levelLabel: string; language: string; rank: number } | null = null;
  for (const language of [...languages.keys()].sort()) {
    for (let rank = courseLevels.length - 1; rank >= 0; rank--) {
      if (isCourseLevelComplete(courseLevels[rank].id, languages.get(language)!)) {
        if (!best || rank > best.rank) best = {
          level: courseLevels[rank].id, levelLabel: courseLevels[rank].label, language, rank,
        };
        break;
      }
    }
  }
  if (!best) return null;
  return { level: best.level, levelLabel: best.levelLabel, language: best.language };
}
