import { createHmac, timingSafeEqual } from "node:crypto";
import { detectLocalMediaContentType } from "./localMediaContentType";
import { ImageProcessingBusyError, sanitizeUploadedImage } from "./imagePrivacy";
import { ALLOWED_IMAGE_TYPES, hasValidRasterImageSignature, isPrivateUploadObjectPath } from "./replit_integrations/object_storage/mediaSecurity";

export const MAX_STORY_BYTES = 50 * 1024 * 1024;
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/ogg", "video/x-msvideo"]);

export interface StoryUploadIdentity {
  owner: string;
  objectPath: string;
  contentType: string;
  size: number;
}

export class InvalidStoryMediaError extends Error {}

export async function prepareStoryMedia(bytes: Buffer, declaredType: string) {
  if (!bytes.length || bytes.length > MAX_STORY_BYTES) throw new InvalidStoryMediaError("Invalid story size");
  const detected = detectLocalMediaContentType(bytes.subarray(0, 64));
  const declared = declaredType.toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(declared) || detected !== declared || !hasValidRasterImageSignature(bytes, declared)) {
    throw new InvalidStoryMediaError("Invalid story media signature");
  }
  let sanitized: Buffer;
  try { sanitized = await sanitizeUploadedImage(bytes, declared, MAX_STORY_BYTES); }
  catch (error) {
    if (error instanceof ImageProcessingBusyError) throw error;
    throw new InvalidStoryMediaError("Invalid story image");
  }
  if (!sanitized.length || sanitized.length > MAX_STORY_BYTES) throw new InvalidStoryMediaError("Invalid stored story size");
  return { bytes: sanitized, contentType: declared };
}

export function createStoryUploadProof(identity: StoryUploadIdentity, secret: string) {
  return createHmac("sha256", secret)
    .update(JSON.stringify(["story-upload-v1", identity.owner, identity.objectPath, identity.contentType, identity.size]))
    .digest("base64url");
}

export function verifyStoryUploadProof(identity: StoryUploadIdentity & { proof: string }, secret: string) {
  // Retain verification for historical video objects, not permission to upload
  // or republish videos in new stories.
  if (!secret || typeof identity.owner !== "string" || !identity.owner || !isPrivateUploadObjectPath(identity.objectPath) ||
    !(ALLOWED_IMAGE_TYPES.has(identity.contentType) || VIDEO_TYPES.has(identity.contentType)) ||
    !Number.isSafeInteger(identity.size) || identity.size <= 0 || identity.size > MAX_STORY_BYTES ||
    typeof identity.proof !== "string") return false;
  const expected = Buffer.from(createStoryUploadProof(identity, secret), "base64url");
  const supplied = Buffer.from(identity.proof, "base64url");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}