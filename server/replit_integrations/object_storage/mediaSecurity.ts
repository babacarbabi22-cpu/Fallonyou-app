import { createHmac, timingSafeEqual } from "node:crypto";

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const IMAGE_UPLOAD_TICKET_TTL_MS = 10 * 60 * 1000;
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export interface ImageUploadMetadata {
  name: unknown;
  size: unknown;
  contentType: unknown;
}

export interface ImageUploadClaims {
  version: 1;
  userId: string;
  objectPath: string;
  contentType: string;
  size: number;
  expiresAt: number;
}

export function validateImageUploadMetadata(input: ImageUploadMetadata): string | null {
  if (typeof input.name !== "string" || input.name.trim().length === 0 || input.name.length > 255) {
    return "A valid image filename is required";
  }
  // Names are only metadata, but reject path-like names so they cannot be
  // mistaken for object paths by callers or future storage adapters.
  if (input.name.includes("/") || input.name.includes("\\") || input.name === "." || input.name === "..") {
    return "Invalid image filename";
  }
  if (!Number.isSafeInteger(input.size) || (input.size as number) <= 0 || (input.size as number) > MAX_IMAGE_UPLOAD_BYTES) {
    return `Image size must be between 1 byte and ${MAX_IMAGE_UPLOAD_BYTES} bytes`;
  }
  if (typeof input.contentType !== "string" || !ALLOWED_IMAGE_TYPES.has(input.contentType.toLowerCase())) {
    return "Only JPEG, PNG, WebP, and GIF images are allowed";
  }
  const expectedExtensions: Record<string, string[]> = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    "image/gif": [".gif"],
  };
  const extension = input.name.toLowerCase().slice(input.name.lastIndexOf("."));
  if (!expectedExtensions[input.contentType.toLowerCase()].includes(extension)) {
    return "Image filename extension does not match its content type";
  }
  return null;
}

export function isPrivateUploadObjectPath(path: string): boolean {
  return /^\/objects\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(path);
}

export interface MediaReadContext {
  authenticated: boolean;
  isPublic: boolean;
  isOwner: boolean;
  isPublishedReference: boolean;
  isAllowedMatchParticipant: boolean;
}

export function canReadMedia(context: MediaReadContext): boolean {
  return context.isPublic ||
    (context.authenticated && (
      context.isOwner ||
      context.isPublishedReference ||
      context.isAllowedMatchParticipant
    ));
}

export function canSendChatMessage(input: {
  isParticipant: boolean;
  isActiveMatch: boolean;
  isBlocked: boolean;
}): boolean {
  return input.isParticipant && input.isActiveMatch && !input.isBlocked;
}

export function isUploadOwnedBy(uploadOwnerId: string | undefined, userId: string): boolean {
  return !!uploadOwnerId && uploadOwnerId === userId;
}

function hmac(value: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(value).digest();
}

export function createImageUploadTicket(
  claims: ImageUploadClaims,
  secret: string,
): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = hmac(payload, secret).toString("base64url");
  return `${payload}.${signature}`;
}

export function verifyImageUploadTicket(
  ticket: string,
  secret: string,
  now = Date.now(),
): ImageUploadClaims | null {
  if (!secret || typeof ticket !== "string" || ticket.length > 2048) return null;
  const pieces = ticket.split(".");
  if (pieces.length !== 2) return null;
  const [payload, encodedSignature] = pieces;
  let signature: Buffer;
  let claims: ImageUploadClaims;
  try {
    signature = Buffer.from(encodedSignature, "base64url");
    const expectedSignature = hmac(payload, secret);
    if (signature.length !== expectedSignature.length || !timingSafeEqual(signature, expectedSignature)) return null;
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (
    claims?.version !== 1 ||
    typeof claims.userId !== "string" || !claims.userId ||
    !isPrivateUploadObjectPath(claims.objectPath) ||
    typeof claims.contentType !== "string" || !ALLOWED_IMAGE_TYPES.has(claims.contentType) ||
    !Number.isSafeInteger(claims.size) || claims.size <= 0 || claims.size > MAX_IMAGE_UPLOAD_BYTES ||
    !Number.isSafeInteger(claims.expiresAt) || claims.expiresAt <= now
  ) return null;
  return claims;
}

export function createImageUploadProof(claims: ImageUploadClaims, secret: string): string {
  return hmac(
    `image-upload-v1\n${claims.userId}\n${claims.objectPath}\n${claims.contentType}\n${claims.size}`,
    secret,
  ).toString("base64url");
}

export function verifyImageUploadProof(
  input: {
    owner: string;
    objectPath: string;
    contentType: string;
    size: number;
    proof: string;
  },
  secret: string,
): boolean {
  if (!secret || !isPrivateUploadObjectPath(input.objectPath) || !ALLOWED_IMAGE_TYPES.has(input.contentType)) return false;
  if (!Number.isSafeInteger(input.size) || input.size <= 0 || input.size > MAX_IMAGE_UPLOAD_BYTES) return false;
  const claims: ImageUploadClaims = {
    version: 1,
    userId: input.owner,
    objectPath: input.objectPath,
    contentType: input.contentType,
    size: input.size,
    expiresAt: 0,
  };
  const expected = Buffer.from(createImageUploadProof(claims, secret), "base64url");
  let supplied: Buffer;
  try {
    supplied = Buffer.from(input.proof, "base64url");
  } catch {
    return false;
  }
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function isOwnedCompletedImageUpload(input: {
  userId: string;
  objectPath: string;
  storedSize: number;
  storedContentType: string;
  policy: {
    owner: string;
    visibility: string;
    contentType?: string;
    size?: number;
    uploadProof?: string;
  } | null;
  secret: string;
}): boolean {
  const policy = input.policy;
  return !!policy &&
    policy.visibility === "private" &&
    policy.owner === input.userId &&
    policy.size === input.storedSize &&
    policy.contentType === input.storedContentType.toLowerCase() &&
    !!policy.uploadProof &&
    verifyImageUploadProof({
      owner: policy.owner,
      objectPath: input.objectPath,
      contentType: policy.contentType,
      size: policy.size,
      proof: policy.uploadProof,
    }, input.secret);
}

export function hasValidRasterImageSignature(bytes: Buffer, contentType: string): boolean {
  if (!ALLOWED_IMAGE_TYPES.has(contentType) || bytes.length < 12) return false;
  switch (contentType) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff &&
        bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
    case "image/png":
      return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) &&
        bytes.subarray(12, 16).toString("ascii") === "IHDR" &&
        bytes.subarray(bytes.length - 8, bytes.length - 4).toString("ascii") === "IEND";
    case "image/gif":
      return ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii")) &&
        bytes[bytes.length - 1] === 0x3b;
    case "image/webp":
      return bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
        bytes.subarray(8, 12).toString("ascii") === "WEBP" &&
        bytes.readUInt32LE(4) + 8 === bytes.length &&
        ["VP8 ", "VP8L", "VP8X"].includes(bytes.subarray(12, 16).toString("ascii"));
    default:
      return false;
  }
}