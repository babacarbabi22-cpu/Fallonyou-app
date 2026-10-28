import type { Request, Response } from "express";
import type { File } from "@google-cloud/storage";
import { pipeline } from "node:stream/promises";
import { MAX_STORY_BYTES } from "./storyMediaSecurity";

export async function streamStoryObject(file: File, req: Request, res: Response) {
  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size);
  const type = String(metadata.contentType || "").toLowerCase();
  if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_STORY_BYTES ||
    !["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime", "video/webm", "video/ogg", "video/x-msvideo"].includes(type)) {
    res.sendStatus(404); return;
  }
  res.set({
    "Content-Type": type, "Cache-Control": "private, no-store", "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline",
  });
  let start = 0, end = size - 1;
  const range = req.method === "HEAD" ? undefined : req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match && (match[1] || match[2])) {
      if (!match[1]) {
        const suffix = Number(match[2]);
        start = Number.isSafeInteger(suffix) && suffix > 0 ? Math.max(size - suffix, 0) : size;
      } else {
        start = Number(match[1]);
        end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      }
    } else start = size;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) {
      res.status(416).set("Content-Range", `bytes */${size}`).end(); return;
    }
    res.status(206).set("Content-Range", `bytes ${start}-${end}/${size}`);
  }
  res.set("Content-Length", String(end - start + 1));
  if (req.method === "HEAD") { res.end(); return; }
  try {
    await pipeline(file.createReadStream(range ? { start, end } : undefined), res);
  } catch {
    if (res.headersSent) res.destroy();
    else {
      res.removeHeader("Content-Length");
      res.status(500).end();
    }
  }
}