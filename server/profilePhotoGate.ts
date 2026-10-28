import type { RequestHandler } from "express";

const setupPaths = new Set([
  "/api/accept-terms",
  "/api/profile-image",
  "/api/preferences",
  "/api/user/delete-account",
  "/api/stats/users",
  "/api/sessions/ping",
  "/api/push/vapid-key",
  "/api/push/subscribe",
  "/api/push/unsubscribe",
  "/api/notifications/preferences",
]);

export function createProfilePhotoGate(hasPhoto: (userId: string) => Promise<boolean>): RequestHandler {
  return async (req, res, next) => {
    if (!req.path.startsWith("/api/") || !req.isAuthenticated()
      || setupPaths.has(req.path) || /^\/api\/photos(?:\/\d+)?$/.test(req.path)) {
      return next();
    }
    try {
      if (!(await hasPhoto(req.user!.id))) {
        return res.status(403).json({ code: "PROFILE_PHOTO_REQUIRED", error: "Add a profile photo to continue." });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
