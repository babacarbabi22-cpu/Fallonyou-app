import type { Express, Request, Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { db } from "./db";
import { users, languageProgress } from "@shared/schema";
import { courseLanguages, hasLanguagePremium } from "@shared/language-course";
import {
  writingLevels, writingLessonId, canPracticeWriting, getWritingExercises, checkWritingAnswer,
  type WritingLevelId,
} from "@shared/writing-course";

type Database = Pick<typeof db, "select" | "transaction">;
const languageSchema = z.enum(courseLanguages);
const levelSchema = z.enum(["starter", "builder", "challenge"]);
const answersSchema = z.object({ answers: z.array(z.string().min(1).max(500)).length(4) }).strict();
class WritingError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export function registerWritingCourseRoutes(app: Express, database: Database = db) {
  app.use("/api/language/writing", (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  }, rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: "draft-7", legacyHeaders: false }));
  const route = (work: (req: Request, res: Response, userId: string) => Promise<unknown>) =>
    async (req: Request, res: Response) => {
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: "not_authenticated" });
      try {
        const [account] = await database.select({ banned: users.isBanned }).from(users).where(eq(users.id, req.user.id));
        if (!account || account.banned === "true") throw new WritingError(403, "account_unavailable");
        await work(req, res, req.user.id);
      } catch (error) {
        if (error instanceof WritingError) return res.status(error.status).json({ error: error.code });
        if (error instanceof z.ZodError) return res.status(400).json({ error: "invalid_writing_input" });
        console.error("[Writing practice] Request failed", error instanceof Error ? error.message : "unknown");
        res.status(500).json({ error: "writing_unavailable" });
      }
    };
  const readState = async (store: Pick<typeof db, "select">, userId: string, language: string) => {
    const [account] = await store.select({
      isPremium: users.isPremium, trialEndsAt: users.trialEndsAt, banned: users.isBanned,
    }).from(users).where(eq(users.id, userId));
    if (!account || account.banned === "true") throw new WritingError(403, "account_unavailable");
    const rows = await store.select({ lessonId: languageProgress.lessonId }).from(languageProgress).where(
      and(eq(languageProgress.userId, userId), eq(languageProgress.language, language)),
    );
    return { premium: hasLanguagePremium(account), completed: new Set(rows.map(row => row.lessonId)) };
  };
  const requireLevel = (levelId: WritingLevelId, state: Awaited<ReturnType<typeof readState>>) => {
    const level = writingLevels.find(item => item.id === levelId)!;
    if (level.premium && !state.premium) throw new WritingError(403, "premium_required");
    if (!canPracticeWriting(levelId, state.completed, state.premium)) throw new WritingError(409, "previous_level_required");
  };
  app.get("/api/language/writing/:lang", route(async (req, res, userId) => {
    const lang = languageSchema.parse(req.params.lang);
    const state = await readState(database, userId, lang);
    res.json({
      isPremium: state.premium,
      levels: writingLevels.map(level => ({
        id: level.id, premium: level.premium, completed: state.completed.has(writingLessonId(level.id)),
        unlocked: canPracticeWriting(level.id, state.completed, state.premium),
      })),
    });
  }));
  app.get("/api/language/writing/:lang/:level", route(async (req, res, userId) => {
    const lang = languageSchema.parse(req.params.lang);
    const level = levelSchema.parse(req.params.level);
    requireLevel(level, await readState(database, userId, lang));
    res.json({ exercises: getWritingExercises(lang, level) });
  }));
  app.post("/api/language/writing/:lang/:level", route(async (req, res, userId) => {
    const lang = languageSchema.parse(req.params.lang);
    const level = levelSchema.parse(req.params.level);
    const { answers } = answersSchema.parse(req.body);
    await database.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"writing-practice:" + userId}))`);
      requireLevel(level, await readState(tx, userId, lang));
      const exercises = getWritingExercises(lang, level);
      if (!exercises.every((exercise, index) => checkWritingAnswer(answers[index], exercise.answer, lang) === "correct"))
        throw new WritingError(400, "incorrect_writing_answers");
      // Independent namespace: never update the learner's course level, rewards, or profile.
      await tx.insert(languageProgress).values({
        userId, language: lang, level: "writing", lessonId: writingLessonId(level),
      }).onConflictDoNothing();
    });
    res.json({ ok: true });
  }));
}
