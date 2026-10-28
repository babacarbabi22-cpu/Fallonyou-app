import type { RequestHandler } from "express";
import multer from "multer";
import { ImageProcessingBusyError } from "./imagePrivacy";
import { InvalidStoryMediaError, MAX_STORY_BYTES } from "./storyMediaSecurity";
import { ALLOWED_IMAGE_TYPES } from "./replit_integrations/object_storage/mediaSecurity";
import { DEFAULT_STORY_AUDIENCE, storyAudienceSchema, type StoryAudience } from "@shared/story-audience";

interface StoryUploadDependencies {
  write: (owner: string, bytes: Buffer, contentType: string) => Promise<string>;
  ownsReference: (owner: string, path: string) => Promise<boolean>;
  insert: (owner: string, path: string, caption: string | null, audience: StoryAudience) => Promise<unknown>;
}

export function createStoryUploadHandler(deps: StoryUploadDependencies, maxBytes = MAX_STORY_BYTES): RequestHandler {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > MAX_STORY_BYTES) throw new Error("Invalid story upload limit");
  // Bound concurrent buffers as well as each body's size. No upload is written
  // to local disk, and no cloud write happens before validation.
  let active = 0;
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: 3, parts: 4, fieldSize: 4096 },
    fileFilter: (_req, file, callback) => {
      const mime = file.mimetype.toLowerCase();
      if (ALLOWED_IMAGE_TYPES.has(mime)) callback(null, true);
      else callback(new InvalidStoryMediaError("Unsupported story media type"));
    },
  }).single("media");

  return (req, res) => {
    const owner = req.isAuthenticated?.() ? req.user?.id : undefined;
    if (!owner) { res.sendStatus(401); return; }
    if (active >= 2) { res.status(429).json({ error: "Story uploads are busy. Try again." }); return; }
    active++;
    let processing = false;
    let released = false;
    const release = () => { if (!released) { released = true; active--; } };
    res.once("close", () => { if (!processing) release(); });
    upload(req, res, error => {
      processing = true;
      void (async () => {
        try {
          if (error) throw error;
          if (req.aborted || res.destroyed) return;
          const audience = storyAudienceSchema.safeParse(req.body?.audience ?? DEFAULT_STORY_AUDIENCE);
          if (!audience.success) {
            res.status(400).json({ error: "Invalid story audience" }); return;
          }
          const caption = req.body?.caption;
          if (caption !== undefined && (typeof caption !== "string" || caption.length > 2000)) {
            res.status(400).json({ error: "Invalid story caption" }); return;
          }
          let path: string;
          if (req.file) {
            path = await deps.write(owner, req.file.buffer, req.file.mimetype);
          } else if (typeof req.body?.mediaUrl === "string" && await deps.ownsReference(owner, req.body.mediaUrl)) {
            // Preserve owned durable direct-URL uploads, never arbitrary URLs
            // or a different member's objects.
            path = req.body.mediaUrl;
          } else {
            res.status(400).json({ error: "Owned story media is required" }); return;
          }
          const story = await deps.insert(owner, path, caption || null, audience.data);
          if (!res.destroyed) res.json(story);
        } catch (failure) {
          if (res.destroyed) return;
          const status = failure instanceof multer.MulterError
            ? failure.code === "LIMIT_FILE_SIZE" ? 413 : 400
            : failure instanceof InvalidStoryMediaError ? 400
            : failure instanceof ImageProcessingBusyError ? 429 : 500;
          res.status(status).json({ error: "Story upload failed" });
        } finally {
          // A disconnected request still holds its slot until cloud work ends.
          req.file = undefined;
          release();
        }
      })();
    });
  };
}