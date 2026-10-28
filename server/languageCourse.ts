import type { Express, Request, Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { users, profiles, languageProgress } from "@shared/schema";
import {
  canonicalLessons, courseLanguages, courseLevels, hasLanguagePremium,
  canStudyCourseLevel, highestCompletedCourseLevel,
} from "@shared/language-course";

type Database = Pick<typeof db, "select" | "insert" | "update" | "transaction">;
const languageSchema = z.enum(courseLanguages);
const completionSchema = z.object({
  language: languageSchema,
  lessonId: z.string().min(1).max(50),
  score: z.number().int().min(0).max(5),
  total: z.number().int().min(1).max(5),
}).passthrough().refine(value => value.score <= value.total);
class CourseError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export function registerLanguageCourseRoutes(app: Express, database: Database = db) {
  const route = (work: (req: Request, res: Response, userId: string) => Promise<unknown>) =>
    async (req: Request, res: Response) => {
      res.setHeader("Cache-Control", "private, no-store");
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: "not_authenticated" });
      try {
        const [account] = await database.select({ banned: users.isBanned }).from(users).where(eq(users.id, req.user.id));
        if (!account || account.banned === "true") return res.status(403).json({ error: "account_unavailable" });
        await work(req, res, req.user.id);
      } catch (error) {
        if (error instanceof CourseError) return res.status(error.status).json({ error: error.code });
        if (error instanceof z.ZodError) return res.status(400).json({ error: "invalid_course_input" });
        console.error("[Language course] Request failed", error instanceof Error ? error.message : "unknown");
        res.status(500).json({ error: "language_course_unavailable" });
      }
    };
  app.get("/api/language/progress", route(async (req, res, userId) => {
    const lang = languageSchema.parse(req.query.lang ?? "en");
    const rows = await database.select().from(languageProgress).where(
      and(eq(languageProgress.userId, userId), eq(languageProgress.language, lang)),
    );
    res.json({ completedLessons: rows.map(row => row.lessonId).filter(id => Object.hasOwn(canonicalLessons, id)) });
  }));
  app.get("/api/language/levels/:lang", route(async (req, res, userId) => {
    const lang = languageSchema.parse(req.params.lang);
    const rows = await database.select().from(languageProgress).where(
      and(eq(languageProgress.userId, userId), eq(languageProgress.language, lang)),
    );
    const completed = new Set(rows.map(row => row.lessonId).filter(id => Object.hasOwn(canonicalLessons, id)));
    const [account] = await database.select({ isPremium: users.isPremium, trialEndsAt: users.trialEndsAt })
      .from(users).where(eq(users.id, userId));
    const premium = hasLanguagePremium(account);
    res.json({
      levels: courseLevels.map(level => ({
        levelId: level.id,
        lessons: level.lessons.map(lesson => ({
          lessonId: lesson.id, category: lesson.category, completed: completed.has(lesson.id),
        })),
        completed: level.lessons.every(lesson => completed.has(lesson.id)),
        requiresLevel: "requiresLevel" in level ? level.requiresLevel : null,
        requiresPremium: level.premium,
        isPremiumUser: premium,
        unlocked: canStudyCourseLevel(level.id, completed, premium),
      })),
      completedLessons: [...completed],
    });
  }));
  app.post("/api/language/progress", route(async (req, res, userId) => {
    const input = completionSchema.parse(req.body);
    const canonical = Object.hasOwn(canonicalLessons, input.lessonId) ? canonicalLessons[input.lessonId] : undefined;
    if (!canonical) throw new CourseError(400, "invalid_lesson");
    if (input.score / input.total < 0.6) throw new CourseError(400, "score_below_threshold");
    const highest = await database.transaction(async tx => {
      // Serialize all of this member's course completions so prerequisites and
      // the cached best level across languages cannot race each other.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"language-course:" + userId}))`);
      const [account] = await tx.select({ isPremium: users.isPremium, trialEndsAt: users.trialEndsAt })
        .from(users).where(eq(users.id, userId));
      const level = courseLevels.find(item => item.id === canonical.level)!;
      const premium = hasLanguagePremium(account);
      if (level.premium && !premium) throw new CourseError(403, "premium_required");
      const rows = await tx.select().from(languageProgress).where(
        and(eq(languageProgress.userId, userId), eq(languageProgress.language, input.language)),
      );
      if (!canStudyCourseLevel(level.id, new Set(rows.map(row => row.lessonId)), premium))
        throw new CourseError(409, "previous_level_required");
      await tx.insert(languageProgress).values({
        userId, language: input.language, level: canonical.level, lessonId: input.lessonId,
      }).onConflictDoNothing();
      const allRows = await tx.select().from(languageProgress).where(eq(languageProgress.userId, userId));
      const summary = highestCompletedCourseLevel(allRows);
      if (summary) await tx.update(profiles).set({ langLevel: summary.level, primaryLang: summary.language })
        .where(eq(profiles.userId, userId));
      return summary;
    });
    res.json({ ok: true, level: canonical.level, completedLevel: highest?.level ?? null });
  }));
  app.get("/api/language/my-level", route(async (_req, res, userId) => {
    const rows = await database.select().from(languageProgress).where(eq(languageProgress.userId, userId));
    res.json(highestCompletedCourseLevel(rows) ?? { level: null, levelLabel: null, language: null });
  }));
}
