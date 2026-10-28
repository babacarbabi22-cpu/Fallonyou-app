import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { mkdtemp, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectLocalMediaContentType, getLocalMediaContentType } from "./localMediaContentType";
import { createLocalMediaAuthorization } from "./localMediaAccess";

function container(brand: string) {
  const bytes = Buffer.alloc(128);
  bytes.writeUInt32BE(24, 0); bytes.write("ftyp", 4); bytes.write(brand, 8);
  return bytes;
}

test("extensionless media: MP4, iPhone MOV, photos and supported containers have an actual MIME type", () => {
  assert.equal(detectLocalMediaContentType(container("isom")), "video/mp4");
  assert.equal(detectLocalMediaContentType(container("qt  ")), "video/quicktime");
  assert.equal(detectLocalMediaContentType(Buffer.from([255, 216, 255, 0])), "image/jpeg");
  assert.equal(detectLocalMediaContentType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "image/png");
  assert.equal(detectLocalMediaContentType(Buffer.from("GIF89a")), "image/gif");
  assert.equal(detectLocalMediaContentType(Buffer.from("RIFF0000WEBP")), "image/webp");
  const webm = Buffer.alloc(16); Buffer.from([0x1a, 0x45, 0xdf, 0xa3]).copy(webm);
  assert.equal(detectLocalMediaContentType(webm), "video/webm");
  assert.equal(detectLocalMediaContentType(Buffer.from("OggS00000000")), "video/ogg");
  assert.equal(detectLocalMediaContentType(Buffer.from("RIFF0000AVI ")), "video/x-msvideo");
  assert.equal(detectLocalMediaContentType(Buffer.from("<html>not media</html>")), undefined);
  assert.equal(detectLocalMediaContentType(Buffer.alloc(0)), undefined);
});

test("MIME inspection reads only a bounded header and never modifies files or follows symlinks", async t => {
  const root = await mkdtemp(join(tmpdir(), "fictional-story-mime-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const name = "a".repeat(32), original = container("qt  ");
  await writeFile(join(root, name), original);
  assert.equal(await getLocalMediaContentType(`/uploads/${name}`, root), "video/quicktime");
  assert.deepEqual(await readFile(join(root, name)), original);
  await assert.rejects(getLocalMediaContentType("/uploads/../outside", root));
  const link = "b".repeat(32);
  await symlink(join(root, name), join(root, link));
  await assert.rejects(getLocalMediaContentType(`/uploads/${link}`, root));
});

test("authenticated HEAD and byte-range GET preserve video MIME, privacy and access checks", async t => {
  const root = await mkdtemp(join(tmpdir(), "fictional-story-http-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const name = "c".repeat(32), bytes = container("isom");
  await writeFile(join(root, name), bytes);
  let sniffCalls = 0;
  const app = express();
  app.use((req, _res, next) => {
    req.isAuthenticated = (() => req.headers["x-fixture-user"] === "fictional-owner") as any;
    req.user = { id: "fictional-owner" } as any; next();
  });
  app.use("/uploads", createLocalMediaAuthorization({
    file: async () => true,
    viewer: async () => ({ isBanned: "false" }),
    owner: async () => "fictional-owner",
    references: async () => null,
    contentType: async path => { sniffCalls++; return getLocalMediaContentType(path, root); },
  }), express.static(root, { dotfiles: "deny", fallthrough: false }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/uploads/${name}`;
  const headers = { "x-fixture-user": "fictional-owner" };
  const head = await fetch(url, { method: "HEAD", headers });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-type"), "video/mp4");
  assert.equal(head.headers.get("cache-control"), "private, no-store");
  assert.equal(head.headers.get("accept-ranges"), "bytes");
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  const range = await fetch(url, { headers: { ...headers, Range: "bytes=0-15" } });
  assert.equal(range.status, 206);
  assert.equal(range.headers.get("content-type"), "video/mp4");
  assert.equal(range.headers.get("content-range"), "bytes 0-15/128");
  assert.deepEqual(Buffer.from(await range.arrayBuffer()), bytes.subarray(0, 16));
  const before = sniffCalls;
  assert.equal((await fetch(url)).status, 404);
  assert.equal(sniffCalls, before, "anonymous callers never inspect private media");
});