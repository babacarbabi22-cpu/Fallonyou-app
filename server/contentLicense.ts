import type { Request, RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { CURRENT_TERMS_VERSION } from "@shared/terms";
import { users } from "@shared/schema";
import { db } from "./db";

const CONTENT_LICENSE_ERROR = "Accept the current terms and content license before posting media.";

/**
 * Require an authenticated user and, when the request carries user-posted
 * media, verify their current license acceptance against the database.
 */
export function requireContentLicense(
  shouldCheckLicense: (req: Request) => boolean | Promise<boolean> = () => true,
): RequestHandler {
  return async (req: Request, res, next) => {
    if (!req.isAuthenticated?.() || !req.user?.id) {
      return res.sendStatus(401);
    }

    try {
      if (!(await shouldCheckLicense(req))) return next();

      const [user] = await db
        .select({ termsAcceptedVersion: users.termsAcceptedVersion })
        .from(users)
        .where(eq(users.id, req.user.id));

      if (!user) return res.sendStatus(401);
      if (user.termsAcceptedVersion !== CURRENT_TERMS_VERSION) {
        return res.status(403).json({
          code: "CONTENT_LICENSE_REQUIRED",
          error: CONTENT_LICENSE_ERROR,
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export function hasImageUrl(req: Request): boolean {
  return typeof req.body?.imageUrl === "string" && req.body.imageUrl.trim().length > 0;
}