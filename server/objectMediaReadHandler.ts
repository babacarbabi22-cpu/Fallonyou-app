import type { RequestHandler } from "express";
import type { File } from "@google-cloud/storage";
import type { ObjectAclPolicy } from "./replit_integrations/object_storage/objectAcl";
import { ObjectNotFoundError } from "./replit_integrations/object_storage/objectStorage";
import { canReadMedia } from "./replit_integrations/object_storage/mediaSecurity";

interface ObjectReadDependencies {
  viewer: (id: string) => Promise<{ isBanned: string | null } | undefined>;
  file: (path: string) => Promise<File>;
  policy: (file: File) => Promise<ObjectAclPolicy | null>;
  verify: (policy: ObjectAclPolicy | null, path: string) => boolean;
  references: (path: string, viewer: string, owner?: string) => Promise<{
    published: boolean; matchParticipant: boolean; selfieAuthorized?: boolean;
  } | null>;
  download: (file: File, req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1], story: boolean) => Promise<void>;
}

export function createObjectMediaReadHandler(deps: ObjectReadDependencies): RequestHandler {
  return async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const userId = req.isAuthenticated?.() ? req.user?.id : undefined;
    if (!userId) { res.sendStatus(404); return; }
    try {
      const viewer = await deps.viewer(userId);
      if (!viewer || viewer.isBanned === "true") { res.sendStatus(404); return; }
      const file = await deps.file(req.path);
      const stored = await deps.policy(file);
      const policy = deps.verify(stored, req.path) ? stored : null;
      if (stored?.mediaClass === "story" && !policy) { res.sendStatus(404); return; }
      if (policy) {
        const [metadata] = await file.getMetadata();
        if (Number(metadata.size) !== policy.size || String(metadata.contentType || "").toLowerCase() !== policy.contentType) {
          res.sendStatus(404); return;
        }
      }
      const referenced = await deps.references(req.path, userId, policy?.owner);
      const allowed = referenced?.selfieAuthorized ?? canReadMedia({
        authenticated: true, isPublic: false, isOwner: policy?.owner === userId,
        isPublishedReference: !!referenced?.published, isAllowedMatchParticipant: !!referenced?.matchParticipant,
      });
      if (!allowed) { res.sendStatus(404); return; }
      await deps.download(file, req, res, policy?.mediaClass === "story");
    } catch (error) {
      if (!res.headersSent) res.sendStatus(error instanceof ObjectNotFoundError ? 404 : 500);
      else res.destroy();
    }
  };
}