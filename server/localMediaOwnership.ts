import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile, readFile, lstat, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import type { MediaDeletionOutcome } from "./mediaDeletionPolicy";

function paths(objectPath: string, root: string) {
  if (!/^\/uploads\/[a-f0-9]{32}$/.test(objectPath)) throw new Error("Invalid local media path");
  const filename = objectPath.slice("/uploads/".length);
  return { file: resolve(root, filename), proof: resolve(root, ".owners", filename + ".json") };
}
function sign(ownerId: string, path: string, size: number, secret: string) {
  if (!secret) throw new Error("Media ownership signing is not configured");
  return createHmac("sha256", secret).update(JSON.stringify({ ownerId, path, size })).digest("hex");
}
export async function markOwnedLocalMedia(ownerId: string, path: string, secret: string, root = resolve("uploads")) {
  const target = paths(path, root);
  const info = await lstat(target.file);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error("Local media is not a regular file");
  await mkdir(resolve(root, ".owners"), { recursive: true });
  await writeFile(target.proof, JSON.stringify({
    ownerId, path, size: info.size, proof: sign(ownerId, path, info.size, secret),
  }), { flag: "wx", mode: 0o600 });
}
// Reading an owned file uses the same proof as deletion, without modifying it.
export async function getVerifiedLocalMediaOwner(path: string, secret: string, root = resolve("uploads")): Promise<string | undefined> {
  const target = paths(path, root);
  try {
    const [info, proofInfo] = await Promise.all([lstat(target.file), lstat(target.proof)]);
    if (!info.isFile() || info.isSymbolicLink() || !proofInfo.isFile() || proofInfo.isSymbolicLink()) return undefined;
    const record = JSON.parse(await readFile(target.proof, "utf8"));
    if (!record || typeof record.ownerId !== "string" || !record.ownerId ||
        record.path !== path || record.size !== info.size ||
        typeof record.proof !== "string" || !/^[a-f0-9]{64}$/.test(record.proof)) return undefined;
    return timingSafeEqual(Buffer.from(record.proof, "hex"), Buffer.from(sign(record.ownerId, path, info.size, secret), "hex"))
      ? record.ownerId : undefined;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" || error instanceof SyntaxError) return undefined;
    throw error;
  }
}
export async function deleteOwnedLocalMedia(ownerId: string, path: string, secret: string, root = resolve("uploads")): Promise<MediaDeletionOutcome> {
  const target = paths(path, root);
  let info;
  try { info = await lstat(target.file); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // A missing image is not authority to remove someone else's sidecar.
      try {
        const record = JSON.parse(await readFile(target.proof, "utf8"));
        if (record && record.ownerId === ownerId && record.path === path &&
            typeof record.size === "number" && record.proof === sign(ownerId, path, record.size, secret)) {
          await unlink(target.proof);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
      }
      return "missing";
    }
    throw error;
  }
  if (!info.isFile() || info.isSymbolicLink()) return "ownership_unverified";
  let record;
  try {
    const proofInfo = await lstat(target.proof);
    if (!proofInfo.isFile() || proofInfo.isSymbolicLink()) return "ownership_unverified";
    record = JSON.parse(await readFile(target.proof, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" || error instanceof SyntaxError) return "ownership_unverified";
    throw error;
  }
  if (!record || typeof record !== "object" ||
      record.ownerId !== ownerId || record.path !== path || record.size !== info.size ||
      typeof record.proof !== "string" || !/^[a-f0-9]{64}$/.test(record.proof) ||
      !timingSafeEqual(Buffer.from(record.proof, "hex"), Buffer.from(sign(ownerId, path, info.size, secret), "hex"))) {
    return "ownership_unverified";
  }
  await unlink(target.file);
  await unlink(target.proof);
  return "deleted";
}