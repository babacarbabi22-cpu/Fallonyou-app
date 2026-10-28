import type { Express, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { and, eq, gt, inArray, or } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { canReadMedia, isPrivateUploadObjectPath, validateImageUploadMetadata } from "./mediaSecurity";
import { canReadVerificationSelfie } from "../../mediaReadPrivacy";
import { db } from "../../db";
import { adventurePhotos, blockedUsers, events, matches, messages, photos, stories, users } from "@shared/schema";
import { getObjectAclPolicy } from "./objectAcl";
import { createUploadPutHandler } from "./uploadPutHandler";
import { recordMediaUpload, finishMediaUpload } from "../../mediaDeletionRepository";
import { createObjectMediaReadHandler } from "../../objectMediaReadHandler";
import { canViewStory } from "@shared/story-audience";
import { getAcceptedStoryConnections } from "../../storyAudienceAccess";

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a short-lived upload ticket
 * 2. The client PUTs directly to the same-origin upload URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express, requireContentLicense: RequestHandler): void {
  const objectStorageService = new ObjectStorageService();
  const uploadSecret = process.env.SESSION_SECRET || "";
  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user!.id,
    message: { error: "Too many image uploads. Please try again later." },
  });
  const uploadPutLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user!.id,
    message: { error: "Too many image uploads. Please try again later." },
  });

  /**
   * Allocate a signed, bounded upload ticket without creating an object.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "/api/uploads/<uuid>?ticket=<short-lived-token>",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then PUT the file to uploadURL.
   */
  app.post("/api/uploads/request-url", requireContentLicense, uploadLimiter, async (req, res) => {
    try {
      const { name, size, contentType } = req.body;
      const validationError = validateImageUploadMetadata({ name, size, contentType });
      if (validationError) return res.status(400).json({ error: validationError });
      if (!uploadSecret) return res.status(503).json({ error: "Secure upload signing is unavailable" });

      const { uploadURL, objectPath } = objectStorageService.getObjectEntityUploadURL(req.user!.id, {
        name,
        size,
        contentType,
      }, uploadSecret);

      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.put(
    "/api/uploads/:objectId",
    requireContentLicense,
    uploadPutLimiter,
    createUploadPutHandler({
      secret: uploadSecret,
      writeObject: async (claims, bytes) => {
        await recordMediaUpload(claims.userId, claims.objectPath);
        await objectStorageService.writeOwnedImageUpload(claims, bytes, uploadSecret);
        await finishMediaUpload(claims.userId, claims.objectPath);
      },
    }),
  );

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves authenticated, ACL/reference-authorized photos and signed stories.
   */
  app.get("/objects/:objectPath(*)", createObjectMediaReadHandler({
    viewer: async id => (await db.select({ isBanned: users.isBanned }).from(users).where(eq(users.id, id)).limit(1))[0],
    file: path => objectStorageService.getObjectEntityFile(path),
    policy: file => getObjectAclPolicy(file),
    verify: (policy, path) => objectStorageService.isVerifiedUploadPolicy(policy, path, uploadSecret),
    references: getReferencedMediaAccess,
    download: (file, req, res, story) => objectStorageService.downloadObject(file, res, req, story),
  }));
}

export async function getReferencedMediaAccess(
  objectPath: string,
  viewerId: string,
  objectOwnerId?: string,
): Promise<{ published: boolean; matchParticipant: boolean; selfieAuthorized?: boolean } | null> {
  if (!isPrivateUploadObjectPath(objectPath) && !/^\/uploads\/[a-f0-9]{32}$/.test(objectPath)) return null;

  const selfieRows = await db.select({ id: users.id }).from(users).where(eq(users.verificationSelfieUrl, objectPath));
  const selfieOwners = selfieRows.filter(row => !objectOwnerId || row.id === objectOwnerId);
  // A verification reference takes precedence over any accidental publication.
  if (selfieOwners.length) {
    const [viewer] = await db.select({ isAdmin: users.isAdmin, isBanned: users.isBanned })
      .from(users).where(eq(users.id, viewerId)).limit(1);
    return {
      published: false, matchParticipant: false,
      selfieAuthorized: canReadVerificationSelfie(viewer, viewerId, selfieOwners.map(row => row.id)),
    };
  }

  const [photoRows, profileRows, eventRows, storyRows, albumRows, messageRows] = await Promise.all([
    db.select({ userId: photos.userId }).from(photos).where(eq(photos.url, objectPath)),
    db.select({ id: users.id }).from(users).where(eq(users.profileImageUrl, objectPath)),
    db.select({ creatorId: events.creatorId }).from(events).where(eq(events.imageUrl, objectPath)),
    db.select({ userId: stories.userId, audience: stories.audience }).from(stories).where(and(eq(stories.mediaUrl, objectPath), gt(stories.expiresAt, new Date()))),
    db.select({ userId: adventurePhotos.userId }).from(adventurePhotos).where(eq(adventurePhotos.photoUrl, objectPath)),
    db.select({ matchId: messages.matchId, senderId: messages.senderId }).from(messages).where(eq(messages.imageUrl, objectPath)),
  ]);
  const acceptedConnections = storyRows.some(row => row.userId !== viewerId && row.audience !== "everyone")
    ? await getAcceptedStoryConnections(viewerId) : new Set<string>();
  const visibleStoryRows = storyRows.filter(row => canViewStory(row, viewerId, acceptedConnections));

  const sourceOwners = new Set<string>([
    ...photoRows.map((row) => row.userId),
    ...profileRows.map((row) => row.id),
    ...eventRows.map((row) => row.creatorId),
    ...visibleStoryRows.map((row) => row.userId),
    ...albumRows.map((row) => row.userId),
  ]);
  if (objectOwnerId) {
    for (const ownerId of Array.from(sourceOwners)) {
      if (ownerId !== objectOwnerId) sourceOwners.delete(ownerId);
    }
  }
  let matchParticipant = false;
  for (const message of messageRows) {
    if (objectOwnerId && message.senderId !== objectOwnerId) continue;
    const [match] = await db.select().from(matches).where(eq(matches.id, message.matchId));
    if (!match || !["matched", "ended"].includes(match.status)) continue;
    if (match.user1Id !== viewerId && match.user2Id !== viewerId) continue;
    const counterpartId = match.user1Id === viewerId ? match.user2Id : match.user1Id;
    // A message image is private to its conversation and becomes inaccessible
    // to either party once either side has blocked the other.
    const blockedRows = await db.select({ id: blockedUsers.id }).from(blockedUsers).where(or(
      and(eq(blockedUsers.userId, viewerId), eq(blockedUsers.blockedUserId, counterpartId)),
      and(eq(blockedUsers.userId, counterpartId), eq(blockedUsers.blockedUserId, viewerId)),
    )).limit(1);
    if (blockedRows.length) continue;
    matchParticipant = true;
    break;
  }

  if (!sourceOwners.size && !matchParticipant) return null;
  // Reject access to published media when the viewer is blocked by its owner.
  if (sourceOwners.size) {
    const ownerIds = Array.from(sourceOwners);
    const blockedRows = await db.select({ id: blockedUsers.id }).from(blockedUsers).where(or(
      and(eq(blockedUsers.userId, viewerId), inArray(blockedUsers.blockedUserId, ownerIds)),
      and(inArray(blockedUsers.userId, ownerIds), eq(blockedUsers.blockedUserId, viewerId)),
    )).limit(1);
    if (blockedRows.length) return null;
  }
  return {
    published: sourceOwners.size > 0,
    matchParticipant,
  };
}

