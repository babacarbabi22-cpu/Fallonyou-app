import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { sanitizeUploadedImage, InvalidUploadedImageError } from "./imagePrivacy";
import { createImageUploadProof, isOwnedCompletedImageUpload } from "./replit_integrations/object_storage/mediaSecurity";

test("synthetic photos lose EXIF, XMP and orientation metadata while remaining decodable", async () => {
  const input = await sharp({ create: { width: 24, height: 12, channels: 3, background: "#77bbdd" } })
    .jpeg().withMetadata({ orientation: 6, exif: { IFD0: { Artist: "FICTIONAL_TEST_METADATA" } } }).toBuffer();
  assert.ok((await sharp(input).metadata()).exif);
  const clean = await sanitizeUploadedImage(input, "image/jpeg");
  const metadata = await sharp(clean).metadata();
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.xmp, undefined);
  assert.equal(metadata.iptc, undefined);
  assert.equal(metadata.orientation, undefined);
  assert.equal(metadata.width, 12);
  assert.equal(metadata.height, 24);
  assert.equal(clean.includes(Buffer.from("FICTIONAL_TEST_METADATA")), false);
});
test("all accepted raster formats remain valid and corrupt/SVG inputs fail closed", async () => {
  for (const [format, mime] of [["png", "image/png"], ["webp", "image/webp"], ["gif", "image/gif"]] as const) {
    const input = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#aabbcc" } }).toFormat(format).toBuffer();
    const clean = await sanitizeUploadedImage(input, mime);
    assert.equal((await sharp(clean).metadata()).format, format);
  }
  await assert.rejects(sanitizeUploadedImage(Buffer.from("<svg/>"), "image/svg+xml"), InvalidUploadedImageError);
  await assert.rejects(sanitizeUploadedImage(Buffer.from([255,216,255,224,...new Array(20).fill(0)]), "image/jpeg"), InvalidUploadedImageError);
});
test("ownership proof must sign the normalized size, not the pre-normalization allocation", async () => {
  const input = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#aabbcc" } }).jpeg().withMetadata().toBuffer();
  const clean = await sanitizeUploadedImage(input, "image/jpeg");
  const claims = { userId: "fictional-owner", objectPath: "/objects/uploads/11111111-1111-4111-8111-111111111111", contentType: "image/jpeg", size: clean.length };
  const secret = "fictional-test-only-secret";
  const metadata = { contentType: claims.contentType, size: clean.length };
  const policy = { owner: claims.userId, visibility: "private", contentType: claims.contentType, size: clean.length, uploadProof: createImageUploadProof(claims, secret) };
  assert.notEqual(input.length, clean.length);
  const check = { policy, storedSize: metadata.size, storedContentType: metadata.contentType, objectPath: claims.objectPath, userId: claims.userId, secret };
  assert.equal(isOwnedCompletedImageUpload(check), true);
  assert.equal(isOwnedCompletedImageUpload({ ...check, policy: { ...policy, size: input.length } }), false);
});