import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "./db";
import { blockedUsers, placeReviewReports, placeReviews, profiles, users } from "@shared/schema";
import { CURRENT_TERMS_VERSION } from "@shared/terms";
import { placeReviewInput, placeReviewKey } from "@shared/place-reviews";
import { registerPlaceReviewRoutes } from "./placeReviews";

test("review input and keys do not invent verified stays or accept invalid ratings", () => {
  const valid = {
    kind: "hotel", placeName: "  Hôtel   Fiction ", city: "París", country: "Spain",
    rating: 4, review: "A fictional past experience.", recommendation: "", pastVisitConfirmed: true,
  };
  assert(placeReviewInput.safeParse(valid).success);
  for (const patch of [{ rating: 0 }, { rating: 6 }, { rating: 3.5 }, { pastVisitConfirmed: false },
    { kind: "flight" }, { authorId: "another-user" }, { hidden: false }, { review: "short" }, { city: "" }]) {
    assert.equal(placeReviewInput.safeParse({ ...valid, ...patch }).success, false);
  }
  assert.equal(placeReviewKey(valid as any), placeReviewKey({
    kind: "hotel", placeName: "hotel fiction", city: "paris", country: "spain",
  }));
  assert.notEqual(placeReviewKey(valid as any), placeReviewKey({ ...valid, kind: "place" } as any));
});

// Development only; all records are fictional and the entire transaction rolls back.
test("real PostgreSQL review API: ownership, ratings, privacy, moderation and account erasure", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "Never run fixtures against production");
  const rollback = new Error("Fictional reviews transaction rollback");
  try {
    await db.transaction(async tx => {
      const prefix = `review-fixture-${randomUUID()}`;
      const [a, b, admin, noPhoto, banned, oldTerms] = ["a", "b", "admin", "noPhoto", "banned", "oldTerms"].map(x => `${prefix}-${x}`);
      const actors = new Set([a, b, admin, noPhoto, banned, oldTerms]);
      await tx.insert(users).values([...actors].map(id => ({
        id, firstName: "Fictional reviewer", ageConfirmed: "true",
        termsAcceptedVersion: id === oldTerms ? "outdated" : CURRENT_TERMS_VERSION,
        isAdmin: id === admin ? "true" : "false",
        isBanned: id === banned ? "true" : "false",
        profileImageUrl: id === noPhoto ? null : "https://example.invalid/fictional-image",
      })));
      await tx.insert(profiles).values([...actors].map(userId => ({ userId })));
      const app = express();
      app.set("trust proxy", false);
      app.use(express.json());
      app.use((req, _res, next) => {
        const id = req.header("x-fixture-actor");
        Object.assign(req, { user: id && actors.has(id) ? { id } : undefined,
          isAuthenticated: () => !!id && actors.has(id) });
        next();
      });
      registerPlaceReviewRoutes(app, tx);
      const server = app.listen(0, "127.0.0.1");
      await new Promise<void>(resolve => server.once("listening", resolve));
      const address = server.address();
      assert(address && typeof address !== "string");
      const call = async (actor: string | undefined, method = "GET", path = "", body?: unknown) => {
        const response = await fetch(`http://127.0.0.1:${address.port}/api/place-reviews${path}`, {
          method, headers: { "Content-Type": "application/json", ...(actor ? { "x-fixture-actor": actor } : {}) },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
      };
      try {
        assert.equal((await call(undefined)).status, 401);
        assert.equal((await call(noPhoto)).status, 403);
        assert.equal((await call(banned)).status, 403);
        assert.equal((await call(oldTerms)).body.error, "content_license_required");
        const input = {
          kind: "hotel", placeName: `Hotel ${prefix}`, city: "Fictional city", country: "Fictional country",
          rating: 4, review: "This describes a fictional past visit.", recommendation: "Try the fictional breakfast.",
          pastVisitConfirmed: true,
        };
        assert.equal((await call(a, "POST", "", { ...input, rating: 6 })).status, 400);
        assert.equal((await call(a, "POST", "", { ...input, pastVisitConfirmed: false })).status, 400);
        assert.equal((await call(a, "POST", "", { ...input, authorId: b })).status, 400);
        const first = await call(a, "POST", "", input);
        assert.equal(first.status, 201);
        const id = first.body.id;
        assert.equal((await call(a, "POST", "", { ...input, placeName: input.placeName.toUpperCase() })).status, 409);
        const additional = await call(a, "POST", "", { ...input, kind: "place", placeName: `Museum ${prefix}` });
        assert.equal(additional.status, 201);
        // Unique conflicts during edits must roll back without damaging the existing review.
        assert.equal((await call(a, "PATCH", `/${additional.body.id}`, input)).status, 409);
        assert.equal((await call(a, "DELETE", `/${additional.body.id}`)).status, 200);
        assert.equal((await call(b, "PATCH", `/${id}`, input)).status, 404);
        assert.equal((await call(b, "DELETE", `/${id}`)).status, 404);
        const second = await call(b, "POST", "", { ...input, rating: 2 });
        assert.equal(second.status, 201);
        const view = await call(a, "GET", `?q=${encodeURIComponent(prefix)}`);
        assert.equal(view.status, 200);
        assert.equal(view.body.reviews.length, 2);
        assert.equal(view.body.reviews[0].averageRating, 3);
        assert.equal(view.body.reviews[0].ratingCount, 2);
        assert.equal(view.cache, "private, no-store");
        for (const row of view.body.reviews) {
          for (const privateKey of ["authorId", "email", "password", "age", "occupation", "termsAcceptedVersion"]) {
            assert.equal(privateKey in row, false);
          }
        }
        assert.equal((await call(a, "GET", `?q=${prefix}&kind=place`)).body.reviews.length, 0);
        assert.equal((await call(a, "GET", `?q=${prefix}&scope=mine`)).body.reviews.length, 1);
        assert.equal((await call(a, "GET", "?scope=moderation")).status, 403);
        assert.equal((await call(a, "GET", "/reports")).status, 403);
        assert.equal((await call(a, "PATCH", `/${id}/moderation`, { hidden: true })).status, 403);
        assert.equal((await call(a, "POST", `/${second.body.id}/report`, { reason: "privacy", details: "Fictional details" })).status, 201);
        assert.equal((await call(a, "POST", `/${second.body.id}/report`, { reason: "privacy" })).body.error, "duplicate_report");
        assert.equal((await call(admin, "GET", "/reports")).body.reports.some((r: any) => r.review.id === second.body.id), true);
        const flags = await call(a, "GET", `?q=${prefix}`);
        assert.equal(flags.body.reviews.find((r: any) => r.id === second.body.id).reportedByMe, true);
        assert.equal((await call(admin, "PATCH", `/${second.body.id}/moderation`, { hidden: true })).status, 200);
        const hidden = await call(a, "GET", `?q=${prefix}`);
        assert.equal(hidden.body.reviews.length, 1);
        assert.equal(hidden.body.reviews[0].averageRating, 4);
        assert.equal((await call(b, "GET", `?q=${prefix}&scope=mine`)).body.reviews[0].hidden, true);
        // Editing a hidden review does not bypass moderation.
        assert.equal((await call(b, "PATCH", `/${second.body.id}`, { ...input, rating: 5 })).status, 200);
        assert.equal((await call(a, "GET", `?q=${prefix}`)).body.reviews.length, 1);
        assert.equal((await call(a, "POST", `/${second.body.id}/report`, { reason: "spam" })).status, 404);
        assert.equal((await call(admin, "PATCH", `/${second.body.id}/moderation`, { hidden: false })).status, 200);
        assert.equal((await call(a, "GET", `?q=${prefix}`)).body.reviews[0].averageRating, 4.5);
        await tx.insert(blockedUsers).values({ userId: b, blockedUserId: a });
        const blocked = await call(a, "GET", `?q=${prefix}`);
        assert.equal(blocked.body.reviews.length, 1);
        assert.equal(blocked.body.reviews[0].ratingCount, 1);
        assert.equal((await call(a, "POST", `/${second.body.id}/report`, { reason: "other" })).status, 404);
        assert.equal((await call(b, "GET", `?q=${prefix}`)).body.reviews.length, 1);
        await tx.delete(blockedUsers).where(eq(blockedUsers.userId, b));
        await tx.update(users).set({ isBanned: "true" }).where(eq(users.id, b));
        assert.equal((await call(a, "GET", `?q=${prefix}`)).body.reviews.length, 1);
        await tx.update(users).set({ isBanned: "false" }).where(eq(users.id, b));
        assert.equal((await call(a, "PATCH", `/${id}`, { ...input, rating: 3 })).status, 200);
        // Deleting a review cascades its report rows.
        assert.equal((await call(b, "DELETE", `/${second.body.id}`)).status, 200);
        assert.equal((await tx.select().from(placeReviewReports).where(eq(placeReviewReports.reviewId, second.body.id))).length, 0);
        const pageInputs = Array.from({ length: 32 }, (_, i) => ({
          ...input, placeName: `${prefix}-page ${i}`, authorId: b,
          placeKey: placeReviewKey({ ...input, placeName: `${prefix}-page ${i}` }),
        }));
        // Seed directly to exercise paging without consuming the HTTP anti-spam allowance.
        await tx.insert(placeReviews).values(pageInputs.map(({ pastVisitConfirmed: _, ...row }) => row));
        const page1 = await call(a, "GET", `?q=${prefix}-page`);
        assert.equal(page1.body.reviews.length, 30);
        assert.equal(typeof page1.body.nextCursor, "number");
        const page2 = await call(a, "GET", `?q=${prefix}-page&cursor=${page1.body.nextCursor}`);
        assert.equal(page2.body.reviews.length, 2);
        assert.equal(page2.body.nextCursor, null);
        assert.equal(page2.body.reviews.some((r: any) => page1.body.reviews.some((one: any) => one.id === r.id)), false);
        assert.equal((await call(a, "GET", "?cursor=-1")).status, 400);
        assert.equal((await call(a, "GET", "?cursor=9007199254740991")).status, 400);
        assert.equal((await call(a, "GET", "?kind=unknown")).status, 400);
        const reportedId = page1.body.reviews[0].id;
        assert.equal((await call(a, "POST", `/${reportedId}/report`, { reason: "other" })).status, 201);
        const openReports = await call(admin, "GET", "/reports");
        const report = openReports.body.reports.find((one: any) => one.review.id === reportedId);
        assert(report);
        assert.equal((await call(a, "PATCH", `/reports/${report.id}`, { resolved: true })).status, 403);
        assert.equal((await call(admin, "PATCH", `/reports/${report.id}`, { resolved: true })).status, 200);
        // Match account-erasure ordering for the fictional account only.
        await tx.delete(profiles).where(eq(profiles.userId, a));
        await tx.delete(users).where(eq(users.id, a));
        assert.equal((await tx.select().from(placeReviews).where(eq(placeReviews.authorId, a))).length, 0);
        assert.equal((await tx.select().from(placeReviewReports).where(eq(placeReviewReports.reporterId, a))).length, 0);
      } finally {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      }
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
});

test.after(async () => { await pool.end(); });
