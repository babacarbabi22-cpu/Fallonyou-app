import type { RequestHandler } from "express";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { users } from "@shared/schema";
import { isPasswordResetToken, passwordRecoveryValidation } from "@shared/password-recovery";
import { db } from "./db";
import { isValidEmail } from "./security";
import { requestCommunicationLocale, type CommunicationLocale } from "@shared/communication-locale";

type RecoveryUser = { id: string; email: string | null; firstName: string | null; password: string | null; notificationPrefs?: string | null };
export type RecoveryDependencies = {
  deliveryReady: () => boolean;
  findUser: (email: string) => Promise<RecoveryUser | undefined>;
  issue: (userId: string, storedToken: string, expiry: Date) => Promise<void>;
  revoke: (userId: string, storedToken: string) => Promise<void>;
  deliver: (email: string, name: string, link: string, locale: CommunicationLocale) => Promise<boolean>;
  hashPassword: (password: string) => Promise<string>;
  consume: (token: string, passwordHash: string, now: Date) => Promise<boolean>;
  baseUrl: () => string;
  now: () => Date;
  token: () => string;
  report: (event: string) => void;
};

export const storedRecoveryToken = (token: string) => `sha256:${createHash("sha256").update(token).digest("hex")}`;
// Only an administrator can issue this token class for a first password.
export const storedManualRecoveryToken = (token: string) => `manual:${storedRecoveryToken(token)}`;
export function recoveryCredentialCondition(token: string) {
  return or(
    and(
      isNotNull(users.password),
      or(eq(users.passwordResetToken, storedRecoveryToken(token)), eq(users.passwordResetToken, token)),
    ),
    eq(users.passwordResetToken, storedManualRecoveryToken(token)),
  );
}
const accepted = { success: true, accepted: true };
const isBody = (body: unknown): body is Record<string, unknown> => !!body && typeof body === "object" && !Array.isArray(body);

export function createPasswordRecoveryHandlers(deps: RecoveryDependencies): { request: RequestHandler; reset: RequestHandler } {
  const request: RequestHandler = async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const email = isBody(req.body) && typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!isValidEmail(email)) return void res.status(400).json({ code: "INVALID_EMAIL" });
    // This check is global and happens before lookup, so outages don't reveal accounts.
    if (!deps.deliveryReady()) return void res.status(503).json({ code: "RECOVERY_UNAVAILABLE" });
    try {
      const user = await deps.findUser(email);
      if (!user?.password || !user.email) return void res.status(202).json(accepted);
      const token = deps.token();
      const stored = storedRecoveryToken(token);
      const expiry = new Date(deps.now().getTime() + 60 * 60 * 1000);
      const link = new URL("/reset-password", deps.baseUrl());
      link.searchParams.set("token", token);
      await deps.issue(user.id, stored, expiry);
      let delivered = false;
      try { delivered = await deps.deliver(user.email, user.firstName || "", link.href, requestCommunicationLocale(req.body.language, user.notificationPrefs)); }
      catch { /* Delivery failures use the same public acknowledgement as unknown emails. */ }
      if (!delivered) {
        deps.report("email-delivery-failed");
        try { await deps.revoke(user.id, stored); }
        catch { deps.report("failed-token-revocation-failed"); }
      }
      // This acknowledges a REQUEST, not delivery, and never discloses existence.
      res.status(202).json(accepted);
    } catch {
      deps.report("request-failed");
      res.status(503).json({ code: "RECOVERY_UNAVAILABLE" });
    }
  };
  const reset: RequestHandler = async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!isBody(req.body) || !isPasswordResetToken(req.body.token)) return void res.status(400).json({ code: "INVALID_RESET_LINK" });
    const validation = passwordRecoveryValidation(req.body.newPassword);
    if (validation) return void res.status(400).json({ code: validation });
    try {
      const passwordHash = await deps.hashPassword(req.body.newPassword as string);
      if (!await deps.consume(req.body.token, passwordHash, deps.now())) {
        return void res.status(400).json({ code: "INVALID_RESET_LINK" });
      }
      res.json({ success: true });
    } catch {
      deps.report("reset-failed");
      res.status(503).json({ code: "RECOVERY_UNAVAILABLE" });
    }
  };
  return { request, reset };
}

export function passwordRecoveryRepository(database = db) {
  return {
    async findUser(email: string) {
      const [user] = await database.select({ id: users.id, email: users.email, firstName: users.firstName, password: users.password, notificationPrefs: users.notificationPrefs })
        .from(users).where(eq(users.email, email)).limit(1);
      return user;
    },
    async issue(userId: string, stored: string, expiry: Date) {
      await database.update(users).set({ passwordResetToken: stored, passwordResetTokenExpiry: expiry }).where(eq(users.id, userId));
    },
    async issueManual(userId: string, stored: string, expiry: Date) {
      // Atomic, cross-instance cooldown: links expire one hour after issuance.
      // Conditional UPDATE serializes competing sends without a new schema.
      const [issued] = await database.update(users)
        .set({ passwordResetToken: stored, passwordResetTokenExpiry: expiry })
        .where(and(
          eq(users.id, userId),
          or(isNull(users.isBanned), eq(users.isBanned, "false")),
          or(isNull(users.passwordResetTokenExpiry),
            lte(users.passwordResetTokenExpiry, new Date(expiry.getTime() - 60_000))),
        )).returning({ id: users.id });
      return Boolean(issued);
    },
    async revoke(userId: string, stored: string) {
      await database.update(users).set({ passwordResetToken: null, passwordResetTokenExpiry: null })
        .where(and(eq(users.id, userId), eq(users.passwordResetToken, stored)));
    },
    async consume(token: string, password: string, now: Date) {
      // Atomic compare/update prevents concurrent reuse. Legacy unexpired links
      // remain usable; all newly issued tokens are stored only as prefixed hashes.
      return database.transaction(async transaction => {
        const [changed] = await transaction.update(users)
          .set({ password, passwordResetToken: null, passwordResetTokenExpiry: null })
          .where(and(
            recoveryCredentialCondition(token),
            gt(users.passwordResetTokenExpiry, now),
          )).returning({ id: users.id });
        if (!changed) return false;
        // Session revocation and password change commit or roll back together.
        await transaction.execute(sql`DELETE FROM sessions WHERE sess->>'userId' = ${changed.id}`);
        return true;
      });
    },
  };
}

export const newRecoveryToken = () => randomBytes(32).toString("hex");
