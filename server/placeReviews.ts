import type { Express, Request, Response } from "express";
import { and, desc, eq, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { db } from "./db";
import { blockedUsers, photos, placeReviewReports as reports, placeReviews as reviews, profiles, users } from "@shared/schema";
import { placeReviewInput, placeReviewKey, placeReviewReportInput, type PlaceReviewItem } from "@shared/place-reviews";
import { CURRENT_TERMS_VERSION } from "@shared/terms";

type Database = Pick<typeof db, "select" | "insert" | "update" | "delete" | "transaction">;
class ReviewError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
const positiveId = (value: unknown) => {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) ||
      !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) {
    throw new ReviewError(400, "invalid_input");
  }
  return Number(value);
};
const searchInput = z.object({
  q: z.string().trim().max(100).default(""),
  kind: z.enum(["hotel", "place"]).optional(),
  scope: z.enum(["community", "mine", "moderation"]).default("community"),
  cursor: z.string().optional(),
}).strict();
const PAGE_SIZE = 30;

// Do not let Drizzle strip qualifiers in this correlated subquery.
function unblocked(actor: string) {
  const author = sql.raw('"place_reviews"."author_id"');
  return sql`not exists (
    select 1 from ${blockedUsers} b
    where (b.user_id = ${actor} and b.blocked_user_id = ${author})
       or (b.blocked_user_id = ${actor} and b.user_id = ${author})
  )`;
}
function visible(actor: string) {
  return and(eq(reviews.hidden, false), sql`${users.isBanned} is distinct from 'true'`, unblocked(actor));
}
const fields = {
  id: reviews.id, authorId: reviews.authorId, placeKey: reviews.placeKey, kind: reviews.kind,
  placeName: reviews.placeName, city: reviews.city, country: reviews.country,
  rating: reviews.rating, review: reviews.review, recommendation: reviews.recommendation,
  hidden: reviews.hidden, createdAt: reviews.createdAt, updatedAt: reviews.updatedAt,
  authorName: users.firstName,
};
type Row = typeof reviews.$inferSelect & { authorName: string | null };
function dto(row: Row, actor: string, averageRating = 0, ratingCount = 0, reportedByMe = false): PlaceReviewItem {
  return {
    id: row.id, placeKey: row.placeKey, kind: row.kind as "hotel" | "place",
    placeName: row.placeName, city: row.city, country: row.country,
    rating: row.rating, review: row.review, recommendation: row.recommendation,
    authorName: row.authorName || "", isOwner: row.authorId === actor,
    hidden: row.hidden, reportedByMe,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    averageRating: Math.round(Number(averageRating) * 10) / 10, ratingCount: Number(ratingCount),
  };
}

export function registerPlaceReviewRoutes(app: Express, database: Database = db) {
  app.use("/api/place-reviews", async (req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (!req.isAuthenticated?.() || !req.user?.id) return res.status(401).json({ error: "not_authenticated" });
    try {
      const [account] = await database.select({
        id: users.id, banned: users.isBanned, admin: users.isAdmin,
        age: users.ageConfirmed, terms: users.termsAcceptedVersion,
        photo: users.profileImageUrl, profile: profiles.id,
      }).from(users).leftJoin(profiles, eq(profiles.userId, users.id)).where(eq(users.id, req.user.id));
      if (!account) return res.status(401).json({ error: "not_authenticated" });
      if (account.banned === "true" || account.age !== "true" || !account.profile) {
        return res.status(403).json({ error: "member_required" });
      }
      const [photo] = account.photo?.trim() ? [true] : await database.select({ id: photos.id })
        .from(photos).where(and(eq(photos.userId, account.id), eq(photos.type, "image"), sql`length(trim(${photos.url})) > 0`)).limit(1);
      if (!photo) return res.status(403).json({ error: "member_required" });
      if (account.terms !== CURRENT_TERMS_VERSION) {
        return res.status(403).json({ error: "content_license_required" });
      }
      res.locals.reviewAdmin = account.admin === "true";
      next();
    } catch {
      console.error("[Place reviews] Membership check failed");
      res.status(503).json({ error: "unavailable" });
    }
  });
  const writeLimit = rateLimit({
    windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
    keyGenerator: req => req.user!.id,
    message: { error: "too_many_requests" },
    skip: req => req.method === "GET",
  });
  app.use("/api/place-reviews", writeLimit);
  const route = (handler: (req: Request, res: Response, actor: string) => Promise<unknown>) =>
    async (req: Request, res: Response) => {
      try { await handler(req, res, req.user!.id); }
      catch (error) {
        if (error instanceof ReviewError) return res.status(error.status).json({ error: error.code });
        if (error instanceof z.ZodError) return res.status(400).json({ error: "invalid_input" });
        const cause = error && typeof error === "object" && "cause" in error ? error.cause : error;
        if (cause && typeof cause === "object" && "code" in cause && cause.code === "23505") {
          return res.status(409).json({ error: "duplicate_review" });
        }
        console.error("[Place reviews] Request failed");
        res.status(503).json({ error: "unavailable" });
      }
    };
  const admin = (res: Response) => {
    if (!res.locals.reviewAdmin) throw new ReviewError(403, "not_allowed");
  };

  app.get("/api/place-reviews", route(async (req, res, actor) => {
    const query = searchInput.parse(req.query);
    if (query.scope === "moderation") admin(res);
    const conditions: (SQL | undefined)[] = [
      query.scope === "community" ? visible(actor) :
        query.scope === "mine" ? eq(reviews.authorId, actor) : undefined,
    ];
    if (query.kind) conditions.push(eq(reviews.kind, query.kind));
    if (query.cursor) conditions.push(lt(reviews.id, positiveId(query.cursor)));
    if (query.q) {
      const term = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`;
      conditions.push(or(ilike(reviews.placeName, term), ilike(reviews.city, term), ilike(reviews.country, term)));
    }
    const rows = await database.select(fields).from(reviews).innerJoin(users, eq(users.id, reviews.authorId))
      .where(and(...conditions)).orderBy(desc(reviews.id)).limit(PAGE_SIZE + 1);
    const page = rows.slice(0, PAGE_SIZE);
    const keys = [...new Set(page.map(row => row.placeKey))];
    const aggregates = keys.length ? await database.select({
      key: reviews.placeKey, average: sql<number>`avg(${reviews.rating})::float`,
      count: sql<number>`count(*)::int`,
    }).from(reviews).innerJoin(users, eq(users.id, reviews.authorId))
      .where(and(visible(actor), inArray(reviews.placeKey, keys))).groupBy(reviews.placeKey) : [];
    const stats = new Map(aggregates.map(value => [value.key, value]));
    const flags = page.length ? await database.select({ reviewId: reports.reviewId }).from(reports)
      .where(and(eq(reports.reporterId, actor), inArray(reports.reviewId, page.map(row => row.id)))) : [];
    const reported = new Set(flags.map(flag => flag.reviewId));
    res.json({
      reviews: page.map(row => dto(row, actor, stats.get(row.placeKey)?.average, stats.get(row.placeKey)?.count, reported.has(row.id))),
      nextCursor: rows.length > PAGE_SIZE ? page[page.length - 1].id : null,
    });
  }));

  app.post("/api/place-reviews", route(async (req, res, actor) => {
    const { pastVisitConfirmed: _, ...input } = placeReviewInput.parse(req.body);
    const [created] = await database.insert(reviews).values({
      ...input, authorId: actor, placeKey: placeReviewKey(input),
    }).onConflictDoNothing({ target: [reviews.authorId, reviews.placeKey] }).returning({ id: reviews.id });
    if (!created) throw new ReviewError(409, "duplicate_review");
    res.status(201).json(created);
  }));
  app.patch("/api/place-reviews/:id", route(async (req, res, actor) => {
    const id = positiveId(req.params.id);
    const { pastVisitConfirmed: _, ...input } = placeReviewInput.parse(req.body);
    const [changed] = await database.transaction(tx => tx.update(reviews).set({
      ...input, placeKey: placeReviewKey(input), updatedAt: new Date(),
    }).where(and(eq(reviews.id, id), eq(reviews.authorId, actor))).returning({ id: reviews.id }));
    if (!changed) throw new ReviewError(404, "not_found");
    res.json(changed);
  }));
  app.delete("/api/place-reviews/:id", route(async (req, res, actor) => {
    const [deleted] = await database.delete(reviews)
      .where(and(eq(reviews.id, positiveId(req.params.id)), eq(reviews.authorId, actor))).returning({ id: reviews.id });
    if (!deleted) throw new ReviewError(404, "not_found");
    res.json({ success: true });
  }));
  app.post("/api/place-reviews/:id/report", route(async (req, res, actor) => {
    const id = positiveId(req.params.id);
    const input = placeReviewReportInput.parse(req.body);
    const [review] = await database.select({ id: reviews.id }).from(reviews).innerJoin(users, eq(users.id, reviews.authorId))
      .where(and(eq(reviews.id, id), visible(actor)));
    if (!review) throw new ReviewError(404, "not_found");
    const [created] = await database.insert(reports).values({ ...input, reviewId: id, reporterId: actor })
      .onConflictDoNothing().returning({ id: reports.id });
    if (!created) throw new ReviewError(409, "duplicate_report");
    res.status(201).json({ success: true });
  }));

  app.get("/api/place-reviews/reports", route(async (req, res, actor) => {
    admin(res);
    const cursor = req.query.cursor === undefined ? undefined : positiveId(req.query.cursor);
    const found = await database.select({
      id: reports.id, reason: reports.reason, details: reports.details, createdAt: reports.createdAt,
      review: fields,
    }).from(reports).innerJoin(reviews, eq(reviews.id, reports.reviewId)).innerJoin(users, eq(users.id, reviews.authorId))
      .where(and(eq(reports.resolved, false), cursor ? lt(reports.id, cursor) : undefined))
      .orderBy(desc(reports.id)).limit(PAGE_SIZE + 1);
    const page = found.slice(0, PAGE_SIZE);
    res.json({
      reports: page.map(row => ({ id: row.id, reason: row.reason, details: row.details,
        createdAt: row.createdAt.toISOString(), review: dto(row.review, actor) })),
      nextCursor: found.length > PAGE_SIZE ? page[page.length - 1].id : null,
    });
  }));
  app.patch("/api/place-reviews/:id/moderation", route(async (req, res) => {
    admin(res);
    const { hidden } = z.object({ hidden: z.boolean() }).strict().parse(req.body);
    const id = positiveId(req.params.id);
    await database.transaction(async tx => {
      const [changed] = await tx.update(reviews).set({ hidden })
        .where(eq(reviews.id, id)).returning({ id: reviews.id });
      if (!changed) throw new ReviewError(404, "not_found");
      await tx.update(reports).set({ resolved: true }).where(eq(reports.reviewId, id));
    });
    res.json({ success: true });
  }));
  app.patch("/api/place-reviews/reports/:id", route(async (req, res) => {
    admin(res);
    z.object({ resolved: z.literal(true) }).strict().parse(req.body);
    const [changed] = await database.update(reports).set({ resolved: true })
      .where(eq(reports.id, positiveId(req.params.id))).returning({ id: reports.id });
    if (!changed) throw new ReviewError(404, "not_found");
    res.json({ success: true });
  }));
}
