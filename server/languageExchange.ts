import type { Express, Request, Response } from "express";
import { and, desc, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "./db";
import { blockedUsers, languageExchangeRequests as requests, languageHelpers, matches, profiles, users } from "@shared/schema";
import { exchangeActionSchema, exchangeLanguageSchema, exchangeRequestSchema, helperPreferencesSchema } from "@shared/language-exchange";

class ExchangeError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Database = Pick<typeof db, "select" | "insert" | "update" | "transaction"> | Transaction;
const pair = (one: string, two: string) => or(
  and(eq(matches.user1Id, one), eq(matches.user2Id, two)),
  and(eq(matches.user1Id, two), eq(matches.user2Id, one)),
);
const blockedPair = (one: string, two: string) => or(
  and(eq(blockedUsers.userId, one), eq(blockedUsers.blockedUserId, two)),
  and(eq(blockedUsers.userId, two), eq(blockedUsers.blockedUserId, one)),
);
async function assertContactAllowed(database: Database, one: string, two: string) {
  if (one === two) throw new ExchangeError(400, "self_request");
  const [account] = await database.select({ id: users.id, banned: users.isBanned })
    .from(users).where(eq(users.id, two));
  if (!account || account.banned === "true") throw new ExchangeError(404, "member_unavailable");
  if ((await database.select({ id: blockedUsers.id }).from(blockedUsers)
    .where(blockedPair(one, two)).limit(1)).length) throw new ExchangeError(403, "contact_not_allowed");
}

export function registerLanguageExchangeRoutes(app: Express, database: Database = db) {
  const route = (work: (req: Request, res: Response, actor: string) => Promise<unknown>) =>
    async (req: Request, res: Response) => {
      res.setHeader("Cache-Control", "private, no-store");
      if (!req.isAuthenticated() || !req.user) return res.status(401).json({ error: "not_authenticated" });
      try {
        const actor = req.user.id;
        const [account] = await database.select({ banned: users.isBanned }).from(users).where(eq(users.id, actor));
        if (!account || account.banned === "true") return res.status(403).json({ error: "account_unavailable" });
        await work(req, res, actor);
      } catch (error) {
        if (error instanceof ExchangeError) return res.status(error.status).json({ error: error.code });
        if (error && typeof error === "object" && "name" in error && error.name === "ZodError")
          return res.status(400).json({ error: "invalid_input" });
        console.error("[Language exchange] Request failed", error instanceof Error ? error.message : "unknown");
        res.status(500).json({ error: "language_exchange_unavailable" });
      }
    };

  app.get("/api/language/exchange/preferences", route(async (_req, res, actor) => {
    const [row] = await database.select().from(languageHelpers).where(eq(languageHelpers.userId, actor));
    res.json({ offeredLanguages: row?.offeredLanguages ?? [] });
  }));
  app.patch("/api/language/exchange/preferences", route(async (req, res, actor) => {
    const values = helperPreferencesSchema.parse(req.body);
    await database.insert(languageHelpers).values({ userId: actor, ...values })
      .onConflictDoUpdate({ target: languageHelpers.userId, set: values });
    res.json(values);
  }));

  app.get("/api/language/exchange/helpers", route(async (req, res, actor) => {
    const language = exchangeLanguageSchema.parse(req.query.lang ?? "en");
    // Apply all eligibility filters BEFORE the limit, including blocks both ways.
    const rows = await database.select({
      id: users.id, firstName: users.firstName, profileImageUrl: users.profileImageUrl,
      offeredLanguages: languageHelpers.offeredLanguages, learningLanguages: profiles.learningLanguages,
      city: sql<string | null>`coalesce(${profiles.currentCity}, ${profiles.homeCity})`,
      bio: sql<string | null>`left(${profiles.bio}, 100)`,
    }).from(languageHelpers).innerJoin(users, eq(users.id, languageHelpers.userId))
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(and(
        ne(users.id, actor), sql`${users.isBanned} is distinct from 'true'`,
        sql`${profiles.incognito} is distinct from true`,
        sql`${language} = any(${languageHelpers.offeredLanguages})`,
        sql`not exists (select 1 from ${blockedUsers} where
          (${blockedUsers.userId} = ${actor} and ${blockedUsers.blockedUserId} = ${users.id}) or
          (${blockedUsers.blockedUserId} = ${actor} and ${blockedUsers.userId} = ${users.id}))`,
        sql`not exists (select 1 from ${matches} where ${matches.status} = 'ended' and
          ((${matches.user1Id} = ${actor} and ${matches.user2Id} = ${users.id}) or
           (${matches.user2Id} = ${actor} and ${matches.user1Id} = ${users.id})))`,
      )).orderBy(users.id).limit(50);
    const connections = rows.length ? await database.select().from(matches).where(and(
      eq(matches.status, "matched"),
      or(and(eq(matches.user1Id, actor), inArray(matches.user2Id, rows.map(r => r.id))),
        and(eq(matches.user2Id, actor), inArray(matches.user1Id, rows.map(r => r.id)))),
    )) : [];
    res.json(rows.map(row => ({ ...row, matchId: connections.find(
      match => match.user1Id === row.id || match.user2Id === row.id)?.id ?? null })));
  }));

  app.get("/api/language/exchange/requests", route(async (_req, res, actor) => {
    const rows = await database.select({
      request: requests,
      otherUser: { id: users.id, firstName: users.firstName, profileImageUrl: users.profileImageUrl },
      connectionStatus: matches.status,
    }).from(requests).innerJoin(users,
      sql`${users.id} = case when ${requests.fromUserId} = ${actor} then ${requests.toUserId} else ${requests.fromUserId} end`)
      .leftJoin(matches, eq(matches.id, requests.matchId))
      .where(and(
        or(eq(requests.fromUserId, actor), eq(requests.toUserId, actor)),
        sql`${users.isBanned} is distinct from 'true'`,
        sql`not exists (select 1 from ${blockedUsers} where
          (${blockedUsers.userId} = ${actor} and ${blockedUsers.blockedUserId} = ${users.id}) or
          (${blockedUsers.blockedUserId} = ${actor} and ${blockedUsers.userId} = ${users.id}))`,
      )).orderBy(sql`case when ${requests.status} = 'pending' then 0 else 1 end`, desc(requests.updatedAt)).limit(200);
    const entries = rows.map(({ request, otherUser, connectionStatus }) => ({
      ...request, matchId: connectionStatus === "matched" ? request.matchId : null, otherUser,
    }));
    res.json({
      incoming: entries.filter(r => r.toUserId === actor),
      outgoing: entries.filter(r => r.fromUserId === actor),
    });
  }));

  app.post("/api/language/exchange/requests", route(async (req, res, actor) => {
    const input = exchangeRequestSchema.parse(req.body);
    const result = await database.transaction(async tx => {
      // Serialize requests and acceptance for this pair, including different languages.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${[actor, input.toUserId].sort().join(":")}))`);
      await assertContactAllowed(tx, actor, input.toUserId);
      const [helper] = await tx.select({ languages: languageHelpers.offeredLanguages, hidden: profiles.incognito })
        .from(languageHelpers).innerJoin(profiles, eq(profiles.userId, languageHelpers.userId))
        .where(eq(languageHelpers.userId, input.toUserId));
      if (!helper || helper.hidden || !helper.languages.includes(input.language))
        throw new ExchangeError(409, "helper_unavailable");
      const connections = await tx.select().from(matches).where(pair(actor, input.toUserId));
      if (connections.some(m => m.status === "ended")) throw new ExchangeError(409, "closed_connection");
      const [existing] = await tx.select().from(requests).where(and(
        eq(requests.fromUserId, actor), eq(requests.toUserId, input.toUserId), eq(requests.language, input.language),
      ));
      if (existing?.status === "pending" || existing?.status === "accepted") return existing;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (existing && existing.updatedAt > since) throw new ExchangeError(429, "request_limit");
      const recent = await tx.select({ id: requests.id }).from(requests)
        .where(and(eq(requests.fromUserId, actor), gte(requests.updatedAt, since))).limit(20);
      if (recent.length >= 20) throw new ExchangeError(429, "request_limit");
      const connection = connections.find(m => m.status === "matched");
      const values = { fromUserId: actor, ...input, status: connection ? "accepted" as const : "pending" as const,
        matchId: connection?.id ?? null, updatedAt: new Date() };
      if (existing) {
        const [row] = await tx.update(requests).set(values).where(eq(requests.id, existing.id)).returning();
        return row;
      }
      const [row] = await tx.insert(requests).values(values).returning();
      return row;
    });
    res.json(result);
  }));

  app.patch("/api/language/exchange/requests/:id", route(async (req, res, actor) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new ExchangeError(400, "invalid_request");
    const { action } = exchangeActionSchema.parse(req.body);
    const result = await database.transaction(async tx => {
      const [initial] = await tx.select().from(requests).where(eq(requests.id, id));
      if (!initial || (initial.fromUserId !== actor && initial.toUserId !== actor))
        throw new ExchangeError(404, "request_unavailable");
      if ((action === "cancel" ? initial.fromUserId : initial.toUserId) !== actor)
        throw new ExchangeError(403, "action_not_allowed");
      const other = initial.fromUserId === actor ? initial.toUserId : initial.fromUserId;
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${[actor, other].sort().join(":")}))`);
      const [current] = await tx.select().from(requests).where(eq(requests.id, id));
      if (!current) throw new ExchangeError(404, "request_unavailable");
      await assertContactAllowed(tx, actor, other);
      const desired = action === "accept" ? "accepted" : action === "decline" ? "declined" : "cancelled";
      if (current.status === desired) return current;
      if (current.status !== "pending") throw new ExchangeError(409, "request_already_resolved");
      let matchId: number | null = null;
      if (action === "accept") {
        const connections = await tx.select().from(matches).where(pair(actor, other));
        if (connections.some(m => m.status === "ended")) throw new ExchangeError(409, "closed_connection");
        let connection = connections.find(m => m.status === "matched") ?? connections[0];
        if (connection) {
          [connection] = await tx.update(matches).set({ status: "matched" })
            .where(eq(matches.id, connection.id)).returning();
        } else {
          [connection] = await tx.insert(matches).values({
            user1Id: current.fromUserId, user2Id: current.toUserId, status: "matched",
          }).returning();
        }
        matchId = connection.id;
      }
      const [row] = await tx.update(requests).set({ status: desired, matchId, updatedAt: new Date() })
        .where(eq(requests.id, id)).returning();
      return row;
    });
    res.json(result);
  }));
}
