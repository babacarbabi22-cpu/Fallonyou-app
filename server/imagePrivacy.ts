import sharp from "sharp";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_UPLOAD_BYTES, hasValidRasterImageSignature } from "./replit_integrations/object_storage/mediaSecurity";
export class InvalidUploadedImageError extends Error {}
export class ImageProcessingBusyError extends Error {}
let processingImages = 0;

// Operates only on new uploads. Decode/re-encode rather than trusting an EXIF
// byte blacklist: this also strips XMP/IPTC while applying EXIF orientation.
export async function sanitizeUploadedImage(bytes: Buffer, mime: string, maxBytes = MAX_IMAGE_UPLOAD_BYTES): Promise<Buffer> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new InvalidUploadedImageError("Invalid image size limit");
  if (processingImages >= 2) throw new ImageProcessingBusyError("Image processing busy; try again shortly");
  processingImages++;
  try { return await decodeImage(bytes, mime, maxBytes); }
  finally { processingImages--; }
}
async function decodeImage(bytes: Buffer, mime: string, maxBytes: number): Promise<Buffer> {
  if (!ALLOWED_IMAGE_TYPES.has(mime) || bytes.length > maxBytes ||
      !hasValidRasterImageSignature(bytes, mime)) throw new InvalidUploadedImageError("Invalid image");
  let pipeline = sharp(bytes, { animated: true, limitInputPixels: 24_000_000, failOn: "warning" }).rotate();
  switch (mime) {
    case "image/jpeg": pipeline = pipeline.jpeg({ quality: 92 }); break;
    case "image/png": pipeline = pipeline.png(); break;
    case "image/webp": pipeline = pipeline.webp({ quality: 92 }); break;
    case "image/gif": pipeline = pipeline.gif(); break;
    default: throw new Error("Unsupported image format");
  }
  let output: Buffer;
  try { output = await pipeline.toBuffer(); }
  catch { throw new InvalidUploadedImageError("Invalid or unsupported image"); }
  if (!output.length || output.length > maxBytes || !hasValidRasterImageSignature(output, mime)) {
    throw new InvalidUploadedImageError("Normalized image exceeds upload limits");
  }
  return output;
}