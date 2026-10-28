import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import express from "express";
import sharp from "sharp";
import { sanitizeUploadedImage } from "./imagePrivacy";
import { ObjectStorageService } from "./replit_integrations/object_storage/objectStorage";
import { ACL_POLICY_METADATA_KEY, getObjectAclPolicy } from "./replit_integrations/object_storage/objectAcl";
import { createImageUploadProof, isOwnedCompletedImageUpload } from "./replit_integrations/object_storage/mediaSecurity";
import { createObjectMediaReadHandler } from "./objectMediaReadHandler";
import { createStoryUploadHandler } from "./storyUploadHandler";
import { createStoryUploadProof, MAX_STORY_BYTES, prepareStoryMedia, verifyStoryUploadProof } from "./storyMediaSecurity";

const secret = "fictional-story-proof-secret";
const owner = "fictional-owner";
const fixedPath = "/objects/uploads/11111111-1111-4111-8111-111111111111";
const lifecycle = { record: async () => {}, finish: async () => {} };
function mp4(brand = "isom") {
  const bytes = Buffer.alloc(128);
  bytes.writeUInt32BE(24, 0); bytes.write("ftyp", 4); bytes.write(brand, 8);
  return bytes;
}
const photo = () => sharp({ create: { width: 2, height: 2, channels: 3, background: "#f0c000" } }).png().toBuffer();

async function historicalVideo(fixture: ReturnType<typeof serviceFixture>) {
  const identity = { owner, objectPath: fixedPath, contentType: "video/mp4", size: 128 };
  await fixture.file(fixedPath).save(mp4(), {
    preconditionOpts: { ifGenerationMatch: 0 },
    metadata: { contentType: "video/mp4", metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify({
        ...identity, visibility: "private", mediaClass: "story",
        uploadProof: createStoryUploadProof(identity, secret),
      }),
    } },
  });
  return fixedPath;
}

// A persistent provider fixture shared by freshly constructed service instances.
// None of these tests call App Storage, the project DB, or users' local files.
function serviceFixture(store = new Map<string, { bytes: Buffer; metadata: any }>()) {
  const service = new ObjectStorageService();
  const file = (path: string): any => ({
    exists: async () => [store.has(path)],
    getMetadata: async () => {
      const stored = store.get(path);
      if (!stored) throw Object.assign(new Error("fixture missing"), { code: 404 });
      return [stored.metadata];
    },
    save: async (bytes: Buffer, options: any) => {
      assert.equal(options.preconditionOpts.ifGenerationMatch, 0);
      assert.ok(options.metadata.metadata[ACL_POLICY_METADATA_KEY], "ownership committed with bytes");
      if (store.has(path)) throw new Error("fixture create-only collision");
      store.set(path, { bytes: Buffer.from(bytes), metadata: {
        ...options.metadata, size: String(bytes.length), generation: "1", metageneration: "1",
      } });
    },
    createReadStream: (options?: { start: number; end: number }) => {
      const bytes = store.get(path)!.bytes;
      return Readable.from([options ? bytes.subarray(options.start, options.end + 1) : bytes]);
    },
    delete: async (options: any) => {
      assert.equal(options.ifGenerationMatch, "1");
      assert.equal(options.ifMetagenerationMatch, "1");
      store.delete(path);
    },
    bucket: { exists: async () => [true] },
  });
  (service as any).getObjectEntityFileHandle = file;
  return { service, store, file };
}

test("story media rejects empty, oversized, wrong signatures, still-image/audio containers and HTML", async () => {
  assert.equal(MAX_STORY_BYTES, 50 * 1024 * 1024);
  await assert.rejects(prepareStoryMedia(Buffer.alloc(0), "video/mp4"));
  await assert.rejects(prepareStoryMedia({ length: MAX_STORY_BYTES + 1 } as Buffer, "video/mp4"));
  await assert.rejects(prepareStoryMedia(Buffer.from("<html>not a video</html>"), "video/mp4"));
  await assert.rejects(prepareStoryMedia(mp4(), "image/jpeg"));
  for (const brand of ["avif", "heic", "M4A "]) await assert.rejects(prepareStoryMedia(mp4(brand), "video/mp4"));
  await assert.rejects(prepareStoryMedia(mp4(), "video/x-m4v"));
  await assert.rejects(prepareStoryMedia(mp4("qt  "), "video/quicktime"));
  const fixture = serviceFixture();
  let recorded = false;
  await assert.rejects(fixture.service.writeOwnedStoryUpload(owner, mp4(), "video/mp4", secret, {
    record: async () => { recorded = true; }, finish: async () => {},
  }));
  assert.equal(recorded, false);
  assert.equal(fixture.store.size, 0);
});

test("durable story proofs bind owner, path, type and size and are not ordinary image-upload proofs", () => {
  const identity = { owner, objectPath: fixedPath, contentType: "video/mp4", size: 128 };
  const proof = createStoryUploadProof(identity, secret);
  assert.equal(verifyStoryUploadProof({ ...identity, proof }, secret), true);
  for (const changed of [{ owner: "other" }, { objectPath: fixedPath.replace("111111111111", "222222222222") },
    { contentType: "image/jpeg" }, { size: 129 }, { size: MAX_STORY_BYTES + 1 }, { proof: "tampered" }]) {
    assert.equal(verifyStoryUploadProof({ ...identity, proof, ...changed }, secret), false);
  }
  assert.equal(verifyStoryUploadProof({ ...identity, proof }, ""), false);
});

test("private create-only story survives a new service instance with no local allocation registry", async () => {
  const fixture = serviceFixture();
  const order: string[] = [];
  const path = await fixture.service.writeOwnedStoryUpload(owner, await photo(), "image/png", secret, {
    record: async () => { order.push("record"); assert.equal(fixture.store.size, 0); },
    finish: async () => { order.push("finish"); assert.equal(fixture.store.size, 1); },
  });
  assert.deepEqual(order, ["record", "finish"]);
  const restarted = serviceFixture(fixture.store).service;
  assert.equal(await restarted.ownsDurableStoryReference(owner, path, secret), true);
  assert.equal(await restarted.ownsDurableStoryReference("other", path, secret), false);
  assert.equal(await restarted.ownsDurableStoryReference(owner, "/uploads/" + "a".repeat(32), secret), false);
  assert.equal(await restarted.ownsDurableStoryReference(owner, "https://untrusted.invalid/media", secret), false);
  const policy = await getObjectAclPolicy(await restarted.getObjectEntityFile(path));
  assert.equal(policy?.visibility, "private");
  assert.equal(policy?.mediaClass, "story");
  assert.equal(isOwnedCompletedImageUpload({
    userId: owner, objectPath: path, storedSize: Number(fixture.store.get(path)!.metadata.size), storedContentType: "image/png", policy, secret,
  }), false);
});

test("photo stories retain sanitization and durable private ownership", async () => {
  const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#f0c000" } }).png()
    .withMetadata({ exif: { IFD0: { Artist: "FICTIONAL_METADATA" } } }).toBuffer();
  const fixture = serviceFixture();
  const path = await fixture.service.writeOwnedStoryUpload(owner, image, "image/png", secret, lifecycle);
  const stored = fixture.store.get(path)!;
  assert.equal(stored.metadata.contentType, "image/png");
  assert.equal((await sharp(stored.bytes).metadata()).exif, undefined);
  assert.equal(await serviceFixture(fixture.store).service.ownsDurableStoryReference(owner, path, secret), true);
  // Valid ignorable PNG chunks, not trailing garbage after the IEND marker.
  const chunkData = Buffer.alloc(512 * 1024 + 4);
  chunkData.write("faKe");
  let crc = 0xffffffff;
  for (const byte of chunkData) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(chunkData.length - 4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  const chunk = Buffer.concat([length, chunkData, checksum]);
  const largePhoto = Buffer.concat([image.subarray(0, -12), ...Array(21).fill(chunk), image.subarray(-12)]);
  await assert.rejects(sanitizeUploadedImage(largePhoto, "image/png"), "ordinary photos keep their smaller limit");
  const prepared = await prepareStoryMedia(largePhoto, "image/png");
  assert.ok(prepared.bytes.length < 10 * 1024 * 1024);
  assert.equal((await sharp(prepared.bytes).metadata()).exif, undefined);
});

test("story erasure only recognizes signed owner and pinned generations, with fictitious provider objects", async () => {
  const fixture = serviceFixture();
  const path = await historicalVideo(fixture);
  assert.equal(await fixture.service.deleteOwnedPrivateUpload("other", path, secret), "ownership_unverified");
  assert.ok(fixture.store.has(path));
  assert.equal(await fixture.service.deleteOwnedPrivateUpload(owner, path, secret), "deleted");
  assert.equal(fixture.store.size, 0);
});

test("object read changes preserve private photos, conversations, verification restrictions and legacy publication", async () => {
  const service = new ObjectStorageService();
  const imagePolicy = {
    owner, visibility: "private" as const, contentType: "image/png", size: 128,
    uploadProof: createImageUploadProof({ userId: owner, objectPath: fixedPath, contentType: "image/png", size: 128, version: 1, expiresAt: 0 }, secret),
  };
  for (const scenario of [
    { user: owner, policy: imagePolicy, refs: null, expected: 200 },
    { user: "peer", policy: imagePolicy, refs: null, expected: 404 },
    { user: "peer", policy: imagePolicy, refs: { published: false, matchParticipant: true }, expected: 200 },
    { user: owner, policy: imagePolicy, refs: { published: false, matchParticipant: false, selfieAuthorized: false }, expected: 404 },
    { user: "fixture-admin", policy: imagePolicy, refs: { published: false, matchParticipant: false, selfieAuthorized: true }, expected: 200 },
    { user: "peer", policy: null, refs: { published: true, matchParticipant: false }, expected: 200 },
    { user: "peer", policy: null, refs: null, expected: 404 },
  ]) {
    let status = 0;
    const response: any = { setHeader() {}, sendStatus(value: number) { status = value; } };
    await createObjectMediaReadHandler({
      viewer: async () => ({ isBanned: "false" }),
      file: async () => ({ getMetadata: async () => [{ size: "128", contentType: "image/png" }] }) as any,
      policy: async () => scenario.policy,
      verify: (policy, path) => service.isVerifiedUploadPolicy(policy, path, secret),
      references: async () => scenario.refs,
      download: async (_file, _req, res, story) => { assert.equal(story, false); res.sendStatus(200); },
    })({ path: fixedPath, user: { id: scenario.user }, isAuthenticated: () => true } as any, response, () => {});
    assert.equal(status, scenario.expected);
  }
});

test("HTTP multipart storage, restart playback, HEAD, ranges and privacy work without real data", async t => {
  const fixture = serviceFixture();
  let current = fixture.service;
  const references = new Set<string>();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.isAuthenticated = (() => !!req.headers["x-fictional-user"]) as any;
    req.user = { id: req.headers["x-fictional-user"] } as any;
    next();
  });
  const deps = {
    write: (id: string, bytes: Buffer, type: string) => current.writeOwnedStoryUpload(id, bytes, type, secret, lifecycle),
    ownsReference: (id: string, path: string) => current.ownsDurableStoryReference(id, path, secret),
    insert: async (id: string, path: string, caption: string | null) => {
      references.add(path); return { id: 1, userId: id, mediaUrl: path, caption, expiresAt: "2099-01-01" };
    },
  };
  app.post("/api/stories", createStoryUploadHandler(deps));
  app.post("/tiny", createStoryUploadHandler(deps, 64));
  app.post("/failed-provider", createStoryUploadHandler({
    ...deps, write: async () => { throw new Error("fictional provider failure"); },
  }));
  app.get("/objects/:path(*)", createObjectMediaReadHandler({
    viewer: async id => id === "ghost" ? undefined : { isBanned: id === "banned" ? "true" : "false" },
    file: path => current.getObjectEntityFile(path),
    policy: file => getObjectAclPolicy(file),
    verify: (policy, path) => current.isVerifiedUploadPolicy(policy, path, secret),
    references: async (path, id) => references.has(path) && id !== "blocked" ? { published: true, matchParticipant: false } : null,
    download: (file, req, res, story) => current.downloadObject(file, res, req, story),
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const headers = { "x-fictional-user": owner };
  const photoBytes = await photo();
  const form = (bytes = photoBytes, mime = "image/png") => {
    const body = new FormData();
    body.append("media", new Blob([new Uint8Array(bytes)], { type: mime }), "fictional.png");
    body.append("caption", "Fictional"); return body;
  };
  assert.equal((await fetch(base + "/api/stories", { method: "POST", body: form() })).status, 401);
  assert.equal(fixture.store.size, 0);
  assert.equal((await fetch(base + "/api/stories", { method: "POST", headers, body: form(mp4(), "video/mp4") })).status, 400);
  assert.equal((await fetch(base + "/api/stories", { method: "POST", headers, body: form(mp4(), "image/png") })).status, 400);
  assert.equal((await fetch(base + "/tiny", { method: "POST", headers, body: form() })).status, 413);
  assert.equal((await fetch(base + "/api/stories", { method: "POST", headers, body: form(Buffer.from("<html>fiction</html>")) })).status, 400);
  assert.equal((await fetch(base + "/failed-provider", { method: "POST", headers, body: form() })).status, 500);
  assert.equal(fixture.store.size, 0);
  const uploaded = await fetch(base + "/api/stories", { method: "POST", headers, body: form() });
  assert.equal(uploaded.status, 200);
  const story = await uploaded.json();
  assert.match(story.mediaUrl, /^\/objects\/uploads\//);
  assert.equal(story.caption, "Fictional");
  current = serviceFixture(fixture.store).service; // Simulated application restart.
  const url = base + story.mediaUrl;
  const storedBytes = fixture.store.get(story.mediaUrl)!.bytes;
  const size = storedBytes.length;
  const head = await fetch(url, { method: "HEAD", headers });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-type"), "image/png");
  assert.equal(head.headers.get("content-length"), String(size));
  assert.equal(head.headers.get("accept-ranges"), "bytes");
  assert.equal(head.headers.get("cache-control"), "private, no-store");
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  for (const [range, start, end] of [["bytes=0-15", 0, 15], ["bytes=20-", 20, size - 1], ["bytes=-8", size - 8, size - 1], ["bytes=0-999", 0, size - 1]] as const) {
    const response = await fetch(url, { headers: { ...headers, Range: range } });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get("content-range"), `bytes ${start}-${end}/${size}`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), storedBytes.subarray(start, end + 1));
  }
  for (const range of ["bytes=999-", "bytes=12-1", "bytes=-0", "bytes=0-1,5-9", "nonsense"]) {
    const response = await fetch(url, { headers: { ...headers, Range: range } });
    assert.equal(response.status, 416); assert.equal(response.headers.get("content-range"), `bytes */${size}`);
  }
  assert.equal((await fetch(url)).status, 404);
  for (const id of ["blocked", "banned", "ghost"]) {
    assert.equal((await fetch(url, { headers: { "x-fictional-user": id } })).status, 404);
  }
  assert.equal((await fetch(url, { headers: { "x-fictional-user": "peer" } })).status, 200);
  references.clear(); // Simulated expiry/removal of the active story reference.
  assert.equal((await fetch(url, { headers: { "x-fictional-user": "peer" } })).status, 404);
  assert.equal((await fetch(url, { headers })).status, 200);
  const direct = (id: string, path: string) => fetch(base + "/api/stories", {
    method: "POST", headers: { "x-fictional-user": id, "Content-Type": "application/json" },
    body: JSON.stringify({ mediaUrl: path }),
  });
  assert.equal((await direct("other", story.mediaUrl)).status, 400);
  assert.equal((await direct(owner, "/uploads/" + "a".repeat(32))).status, 400);
  assert.equal((await direct(owner, story.mediaUrl)).status, 200);
  const stored = fixture.store.get(story.mediaUrl)!;
  const policy = JSON.parse(stored.metadata.metadata[ACL_POLICY_METADATA_KEY]);
  policy.uploadProof = "tampered";
  stored.metadata.metadata[ACL_POLICY_METADATA_KEY] = JSON.stringify(policy);
  assert.equal((await fetch(url, { headers })).status, 404);
  const oldPath = await historicalVideo(fixture);
  references.add(oldPath);
  assert.equal((await fetch(base + oldPath, { headers, method: "HEAD" })).headers.get("content-type"), "video/mp4");
  const oldVideo = await fetch(base + oldPath, { headers: { ...headers, Range: "bytes=0-15" } });
  assert.equal(oldVideo.status, 206);
  assert.deepEqual(Buffer.from(await oldVideo.arrayBuffer()), mp4().subarray(0, 16));
  assert.equal((await direct(owner, oldPath)).status, 400, "even owned old videos cannot be republished");
  assert.equal(fixture.store.get(oldPath)!.bytes.length, 128, "historical video was not deleted");
});

test("concurrent multipart buffers are bounded and busy requests cannot write", async t => {
  let entered = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const app = express();
  app.use((req, _res, next) => { req.isAuthenticated = (() => true) as any; req.user = { id: owner } as any; next(); });
  app.post("/story", createStoryUploadHandler({
    write: async () => { entered++; await gate; return fixedPath; },
    ownsReference: async () => false, insert: async () => ({ id: 1 }),
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  t.after(() => { release(); server.close(); });
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/story`;
  const photoBytes = await photo();
  const post = () => {
    const body = new FormData(); body.append("media", new Blob([new Uint8Array(photoBytes)], { type: "image/png" }), "fictional.png");
    return fetch(url, { method: "POST", body });
  };
  const first = post(), second = post();
  for (let i = 0; i < 100 && entered < 2; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(entered, 2);
  assert.equal((await post()).status, 429);
  assert.equal(entered, 2);
  release();
  assert.equal((await first).status, 200); assert.equal((await second).status, 200);
  assert.equal((await post()).status, 200);
});