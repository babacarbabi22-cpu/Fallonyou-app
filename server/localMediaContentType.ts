import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { resolve } from "node:path";

// Multer's extensionless names must not make Safari receive videos as octet-stream.
// Inspect only the header; never rewrite the media or its ownership sidecar.
export function detectLocalMediaContentType(bytes: Buffer): string | undefined {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))) return "image/gif";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (bytes.length < 12) return undefined;
  const box = bytes.toString("ascii", 4, 8);
  if (box === "ftyp") return bytes.toString("ascii", 8, 12) === "qt  " ? "video/quicktime" : "video/mp4";
  if (["wide", "moov", "mdat", "free"].includes(box)) return "video/quicktime";
  if (bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return "video/webm";
  if (bytes.toString("ascii", 0, 4) === "OggS") return "video/ogg";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "AVI ") return "video/x-msvideo";
  return undefined;
}

export async function getLocalMediaContentType(path: string, root = resolve("uploads")) {
  if (!/^\/uploads\/[a-f0-9]{32}$/.test(path)) throw new Error("Invalid local media path");
  const file = await open(resolve(root, path.slice("/uploads/".length)), constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!(await file.stat()).isFile()) throw new Error("Invalid local media file");
    const bytes = Buffer.alloc(64);
    const { bytesRead } = await file.read(bytes, 0, bytes.length, 0);
    return detectLocalMediaContentType(bytes.subarray(0, bytesRead));
  } finally {
    await file.close();
  }
}