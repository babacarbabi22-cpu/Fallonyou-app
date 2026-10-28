import type { RequestHandler } from "express";
import { lstat } from "node:fs/promises";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";
import { getVerifiedLocalMediaOwner } from "./localMediaOwnership";
import { getReferencedMediaAccess } from "./replit_integrations/object_storage/routes";
import { canReadMedia } from "./replit_integrations/object_storage/mediaSecurity";
import { getLocalMediaContentType } from "./localMediaContentType";

interface AccessDependencies {
  file: (path: string) => Promise<boolean>;
  viewer: (id: string) => Promise<{ isBanned: string | null } | undefined>;
  owner: (path: string) => Promise<string | undefined>;
  references: typeof getReferencedMediaAccess;
  contentType?: (path: string) => Promise<string | undefined>;
}
const defaults: AccessDependencies = {
  file: async path => {
    try {
      const info = await lstat(resolve("uploads", path.slice("/uploads/".length)));
      return info.isFile() && !info.isSymbolicLink();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  },
  viewer: async id => (await db.select({ isBanned: users.isBanned }).from(users).where(eq(users.id, id)).limit(1))[0],
  owner: path => getVerifiedLocalMediaOwner(path, process.env.SESSION_SECRET || ""),
  references: getReferencedMediaAccess,
  contentType: getLocalMediaContentType,
};

export function createLocalMediaAuthorization(deps: AccessDependencies = defaults): RequestHandler {
  return async (req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    const viewerId = req.isAuthenticated?.() ? req.user?.id : undefined;
    // Mounted under /uploads. Never expose sidecars, directories or arbitrary filenames.
    if (!viewerId || !/^\/[a-f0-9]{32}$/.test(req.path)) {
      res.sendStatus(404);
      return;
    }
    try {
      const viewer = await deps.viewer(viewerId);
      if (!viewer || viewer.isBanned === "true") {
        res.sendStatus(404);
        return;
      }
      const path = `/uploads${req.path}`;
      if (!(await deps.file(path))) {
        res.sendStatus(404);
        return;
      }
      const owner = await deps.owner(path);
      const references = await deps.references(path, viewerId, owner);
      const allowed = references?.selfieAuthorized ?? canReadMedia({
        authenticated: true, isPublic: false, isOwner: owner === viewerId,
        isPublishedReference: !!references?.published,
        isAllowedMatchParticipant: !!references?.matchParticipant,
      });
      if (!allowed) {
        res.sendStatus(404);
        return;
      }
      // Keep Express static's HEAD/byte-range support, after the same access checks.
      const contentType = await deps.contentType?.(path);
      if (contentType) res.setHeader("Content-Type", contentType);
      next();
    } catch {
      res.sendStatus(500);
    }
  };
}