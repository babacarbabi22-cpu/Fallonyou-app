import type { RequestHandler } from "express";
import type { Match, Photo, Profile, User } from "@shared/schema";
import { toPublicPhoto, toPublicProfile, toPublicUser } from "./publicUser";

export type MemberConnectionStatus = "none" | "pending" | "connected";

type Dependencies = {
  viewerHasPhoto: (viewerId: string) => Promise<boolean>;
  blockedIds: (viewerId: string) => Promise<Set<string>>;
  member: (memberId: string) => Promise<Partial<User> | undefined>;
  profile: (memberId: string) => Promise<Partial<Profile> | undefined>;
  photos: (memberId: string) => Promise<Partial<Photo>[]>;
  connection: (viewerId: string, memberId: string) => Promise<Pick<Match, "user1Id" | "status"> | undefined>;
};

export function memberConnectionStatus(
  viewerId: string,
  connection: Pick<Match, "user1Id" | "status"> | undefined,
): MemberConnectionStatus {
  if (connection?.status === "matched") return "connected";
  if (connection?.status === "liked" && connection.user1Id === viewerId) return "pending";
  // Never disclose incoming likes or change the incoming-liked-by Premium gate.
  return "none";
}

export function createMemberProfileHandler(deps: Dependencies): RequestHandler {
  return async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (!req.isAuthenticated()) {
      res.sendStatus(401);
      return;
    }
    const viewerId = req.user!.id;
    const memberId = req.params.userId;
    if (!memberId || memberId.length > 128 || memberId === viewerId) {
      res.sendStatus(404);
      return;
    }
    try {
      if (!await deps.viewerHasPhoto(viewerId)) {
        res.sendStatus(403);
        return;
      }
      const [member, blocked] = await Promise.all([
        deps.member(memberId),
        deps.blockedIds(viewerId),
      ]);
      // A generic not-found response avoids revealing blocked/banned identities.
      if (!member || member.isBanned === "true" || blocked.has(memberId)) {
        res.sendStatus(404);
        return;
      }
      const [profile, photos, connection] = await Promise.all([
        deps.profile(memberId),
        deps.photos(memberId),
        deps.connection(viewerId, memberId),
      ]);
      if (!member.profileImageUrl && !photos.some(photo => Boolean(photo.url))) {
        res.sendStatus(404);
        return;
      }
      res.json({
        ...toPublicUser(member),
        profile: toPublicProfile(profile),
        photos: photos.map(toPublicPhoto),
        connectionStatus: memberConnectionStatus(viewerId, connection),
      });
    } catch (error) {
      console.error("Unable to load public member profile:", error instanceof Error ? error.message : "Unknown failure");
      res.sendStatus(500);
    }
  };
}