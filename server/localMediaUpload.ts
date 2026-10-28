import type { RequestHandler } from "express";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { recordMediaUpload, finishMediaUpload } from "./mediaDeletionRepository";
import { markOwnedLocalMedia } from "./localMediaOwnership";
import { hasValidRasterImageSignature } from "./replit_integrations/object_storage/mediaSecurity";
import { sanitizeUploadedImage, ImageProcessingBusyError } from "./imagePrivacy";

export function hasValidLocalMediaSignature(bytes: Buffer, mime: string) {
  if (!mime.startsWith("video/")) return hasValidRasterImageSignature(bytes, mime);
  // Preserve the existing story video flow (MP4/MOV, WebM, Ogg and AVI).
  return bytes.length >= 12 && (
    ["ftyp", "moov", "mdat", "wide", "free"].includes(bytes.toString("ascii", 4, 8)) ||
    bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) ||
    bytes.toString("ascii", 0, 4) === "OggS" ||
    (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "AVI ")
  );
}

export const requireUploadAuthentication: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  next();
};

export const trackLocalMediaUpload: RequestHandler = (req, res, next) => {
  const file = req.file;
  if (!file) return next();
  const ownerId = req.user?.id;
  if (!ownerId || !/^[a-f0-9]{32}$/.test(file.filename)) return res.sendStatus(400);
  const objectPath = "/uploads/" + file.filename;
  void (async () => {
    try {
      const bytes = await readFile(file.path);
      if (!hasValidLocalMediaSignature(bytes, file.mimetype.toLowerCase())) {
        await unlink(resolve("uploads", file.filename));
        return res.status(400).json({ error: "Invalid image or video" });
      }
      if (!file.mimetype.toLowerCase().startsWith("video/")) {
        let sanitized: Buffer;
        try { sanitized = await sanitizeUploadedImage(bytes, file.mimetype.toLowerCase()); }
        catch (error) {
          await unlink(resolve("uploads", file.filename));
          if (error instanceof ImageProcessingBusyError) return res.status(429).json({ error: error.message });
          return res.status(400).json({ error: "Invalid or unsupported image" });
        }
        await writeFile(file.path, sanitized);
        file.size = sanitized.length;
      }
      await recordMediaUpload(ownerId, objectPath);
      await markOwnedLocalMedia(ownerId, objectPath, process.env.SESSION_SECRET || "");
      await finishMediaUpload(ownerId, objectPath);
      next();
    } catch (error) {
      // This filename came from this request's multer write, not a user URL.
      await unlink(resolve("uploads", file.filename)).catch(() => {});
      next(error);
    }
  })();
};