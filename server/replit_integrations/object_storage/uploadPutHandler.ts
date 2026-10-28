import type { RequestHandler } from "express";
import { InvalidUploadedImageError, ImageProcessingBusyError } from "../../imagePrivacy";
import {
  hasValidRasterImageSignature,
  MAX_IMAGE_UPLOAD_BYTES,
  verifyImageUploadTicket,
} from "./mediaSecurity";
import type { ImageUploadClaims } from "./mediaSecurity";

class UploadBodyError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function readBoundedBody(req: Parameters<RequestHandler>[0], expectedSize: number): Promise<Buffer> {
  const contentLengthHeader = req.get("content-length");
  if (!contentLengthHeader || !/^\d+$/.test(contentLengthHeader)) {
    throw new UploadBodyError(411, "Content-Length is required");
  }
  if (Number(contentLengthHeader) !== expectedSize || expectedSize > MAX_IMAGE_UPLOAD_BYTES) {
    throw new UploadBodyError(413, "Upload size does not match the allocation");
  }
  if (req.get("content-encoding")) throw new UploadBodyError(415, "Encoded uploads are not supported");

  const chunks: Buffer[] = [];
  let total = 0;
  let oversized = false;
  for await (const value of req) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    total += chunk.length;
    if (total > expectedSize) {
      oversized = true;
      continue;
    }
    chunks.push(chunk);
  }
  if (oversized || total > MAX_IMAGE_UPLOAD_BYTES) {
    throw new UploadBodyError(413, "Image exceeds the permitted size");
  }
  if (total !== expectedSize) throw new UploadBodyError(400, "Upload size does not match the allocation");
  return Buffer.concat(chunks, total);
}

export function createUploadPutHandler({
  secret,
  writeObject,
}: {
  secret: string;
  writeObject: (claims: ImageUploadClaims, bytes: Buffer) => Promise<void>;
}): RequestHandler {
  let activeUploads = 0;
  const activeByUser = new Map<string, number>();

  return async (req, res) => {
    const userId = req.user?.id;
    const objectId = req.params.objectId;
    const ticketValue = req.query.ticket;
    const ticket = typeof ticketValue === "string" ? ticketValue : "";
    const claims = verifyImageUploadTicket(ticket, secret);
    if (!userId || !claims || claims.userId !== userId ||
      claims.objectPath !== `/objects/uploads/${objectId}`) {
      return res.status(403).json({ error: "Invalid or expired upload ticket" });
    }
    if ((req.get("content-type") || "").toLowerCase() !== claims.contentType) {
      return res.status(415).json({ error: "Upload content type does not match the allocation" });
    }
    if (activeUploads >= 8 || (activeByUser.get(userId) || 0) >= 2) {
      return res.status(429).json({ error: "Too many simultaneous uploads" });
    }

    activeUploads += 1;
    activeByUser.set(userId, (activeByUser.get(userId) || 0) + 1);
    try {
      const bytes = await readBoundedBody(req, claims.size);
      if (!hasValidRasterImageSignature(bytes, claims.contentType)) {
        return res.status(415).json({ error: "Uploaded bytes are not a supported raster image" });
      }
      await writeObject(claims, bytes);
      return res.status(201).json({ success: true, objectPath: claims.objectPath });
    } catch (error) {
      if (error instanceof ImageProcessingBusyError) return res.status(429).json({ error: error.message });
      if (error instanceof InvalidUploadedImageError) {
        return res.status(400).json({ error: error.message });
      }
      if (error instanceof UploadBodyError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("Failed to persist image upload:", error);
      return res.status(500).json({ error: "Failed to store image upload" });
    } finally {
      activeUploads -= 1;
      const remaining = (activeByUser.get(userId) || 1) - 1;
      if (remaining) activeByUser.set(userId, remaining);
      else activeByUser.delete(userId);
    }
  };
}