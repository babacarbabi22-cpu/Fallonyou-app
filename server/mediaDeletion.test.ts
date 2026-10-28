import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeManagedMediaPath, deletionRetryPolicy } from "./mediaDeletionPolicy";
import { markOwnedLocalMedia, deleteOwnedLocalMedia } from "./localMediaOwnership";
import { processMediaDeletionQueue } from "./mediaDeletionWorker";
import type { MediaDeletionJob } from "./mediaDeletionRepository";
import { ObjectStorageService } from "./replit_integrations/object_storage/objectStorage";
import { createImageUploadProof } from "./replit_integrations/object_storage/mediaSecurity";
import { hasValidLocalMediaSignature } from "./localMediaUpload";

const cloudPath = "/objects/uploads/11111111-1111-4111-8111-111111111111";
const localPath = "/uploads/" + "a".repeat(32);
const secret = "fixture-signing-secret-not-used-by-the-app";
const job: MediaDeletionJob = {
  id: 1, ownerId: "fixture-owner", path: cloudPath, status: "processing",
  attempts: 1, nextAttemptAt: new Date(), leaseUntil: new Date(),
  leaseToken: "fixture-lease", errorCode: null, createdAt: new Date(),
};

test("ownership tracking preserves raster photos and existing story video containers", () => {
  const jpeg = Buffer.alloc(20);
  Buffer.from([0xff, 0xd8, 0xff]).copy(jpeg);
  Buffer.from([0xff, 0xd9]).copy(jpeg, jpeg.length - 2);
  assert(hasValidLocalMediaSignature(jpeg, "image/jpeg"));
  const mp4 = Buffer.alloc(16); mp4.write("ftyp", 4);
  const mov = Buffer.alloc(16); mov.write("wide", 4);
  const webm = Buffer.alloc(16); Buffer.from([0x1a, 0x45, 0xdf, 0xa3]).copy(webm);
  assert(hasValidLocalMediaSignature(mp4, "video/mp4"));
  assert(hasValidLocalMediaSignature(mov, "video/quicktime"));
  assert(hasValidLocalMediaSignature(webm, "video/webm"));
  assert(!hasValidLocalMediaSignature(Buffer.from("<html>bad upload</html>"), "video/mp4"));
});
test("managed references strip credentials and never select arbitrary buckets or traversal", () => {
  assert.equal(normalizeManagedMediaPath(cloudPath), cloudPath);
  assert.equal(normalizeManagedMediaPath(localPath), localPath);
  assert.equal(normalizeManagedMediaPath("https://storage.googleapis.com/fixture/private/uploads/" +
    cloudPath.split("/").at(-1) + "?signature=not-retained", "/fixture/private"), cloudPath);
  for (const path of ["/uploads/../secret", "/uploads/.owners/proof.json",
    "https://storage.googleapis.com/another-bucket/private/file", "https://example.invalid/photo.jpg"]) {
    assert.equal(normalizeManagedMediaPath(path, "/fixture/private"), null);
  }
});

test("local media needs persisted valid ownership, survives restart, and never deletes another owner's file", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "fixture-media-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = join(root, "a".repeat(32));
  await writeFile(file, "fixture image bytes");
  assert.equal(await deleteOwnedLocalMedia(job.ownerId, localPath, secret, root), "ownership_unverified");
  await markOwnedLocalMedia(job.ownerId, localPath, secret, root);
  assert.equal(await deleteOwnedLocalMedia("another-owner", localPath, secret, root), "ownership_unverified");
  assert.equal(await deleteOwnedLocalMedia(job.ownerId, localPath, "wrong-secret", root), "ownership_unverified");
  assert.equal((await readFile(file)).toString(), "fixture image bytes");
  assert.equal(await deleteOwnedLocalMedia(job.ownerId, localPath, secret, root), "deleted");
  await assert.rejects(access(file));
  assert.equal(await deleteOwnedLocalMedia(job.ownerId, localPath, secret, root), "missing");
});

function cloudFixture(options: { owner?: string; error?: number; bucket?: boolean; deletionError?: boolean } = {}) {
  const owner = options.owner || job.ownerId;
  const policy = {
    owner, visibility: "private", size: 20, contentType: "image/jpeg",
    uploadProof: createImageUploadProof({ userId: owner, objectPath: cloudPath, size: 20, contentType: "image/jpeg" }, secret),
  };
  let deleteOptions: unknown;
  const file = {
    bucket: { exists: async () => [options.bucket !== false] },
    getMetadata: async () => {
      if (options.error) throw Object.assign(new Error("fixture error"), { code: options.error });
      return [{
        size: "20", contentType: "image/jpeg", generation: "10", metageneration: "2",
        metadata: { "custom:aclPolicy": JSON.stringify(policy) },
      }];
    },
    delete: async (conditions: unknown) => {
      if (options.deletionError) throw new Error("fixture transient deletion failure");
      deleteOptions = conditions;
    },
  };
  const service = new ObjectStorageService();
  // Replace only the file handle. No sidecar, real bucket or credentials used.
  Object.defineProperty(service, "getObjectEntityFileHandle", { value: () => file });
  return { service, getDeleteOptions: () => deleteOptions };
}

test("cloud deletion requires signed ownership and pins object generation", async () => {
  const own = cloudFixture();
  assert.equal(await own.service.deleteOwnedPrivateUpload(job.ownerId, cloudPath, secret), "deleted");
  assert.deepEqual(own.getDeleteOptions(), { ignoreNotFound: true, ifGenerationMatch: "10", ifMetagenerationMatch: "2" });
  const other = cloudFixture({ owner: "another-owner" });
  assert.equal(await other.service.deleteOwnedPrivateUpload(job.ownerId, cloudPath, secret), "ownership_unverified");
  assert.equal(other.getDeleteOptions(), undefined);
});

test("missing cloud objects are idempotent, but provider/bucket failures are not absence", async () => {
  assert.equal(await cloudFixture({ error: 404 }).service.deleteOwnedPrivateUpload(job.ownerId, cloudPath, secret), "missing");
  await assert.rejects(cloudFixture({ error: 503 }).service.deleteOwnedPrivateUpload(job.ownerId, cloudPath, secret));
  await assert.rejects(cloudFixture({ error: 404, bucket: false }).service.deleteOwnedPrivateUpload(job.ownerId, cloudPath, secret));
  await assert.rejects(cloudFixture({ deletionError: true }).service.deleteOwnedPrivateUpload(job.ownerId, cloudPath, secret));
});

test("queue completes confirmed deletions, retains legacy ownership review, and retries provider failure", async () => {
  const actions: unknown[] = [];
  const repository = {
    claim: async () => [job],
    complete: async () => { actions.push("complete"); },
    postpone: async (_job: MediaDeletionJob, status: string, code: string, delay: number) => {
      actions.push({ status, code, delay });
    },
  };
  await processMediaDeletionQueue(repository, async () => "deleted");
  await processMediaDeletionQueue(repository, async () => "missing");
  await processMediaDeletionQueue(repository, async () => "ownership_unverified");
  await processMediaDeletionQueue(repository, async () => { throw new Error("provider details must not be stored"); });
  assert.deepEqual(actions, ["complete", "complete",
    { status: "review", code: "ownership_unverified", delay: 0 },
    { status: "retry", code: "storage_unavailable", delay: 60_000 }]);
  assert.equal(deletionRetryPolicy(8).status, "review");
});