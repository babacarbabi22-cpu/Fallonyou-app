import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { once } from "node:events";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import http, { type Server } from "node:http";
import { brotliDecompressSync, gunzipSync } from "node:zlib";
import express from "express";
import { serveCompressedAssets } from "./compressedAssets";
import { precompressAssets } from "../script/precompress-assets";

let directory: string;
let assets: string;
let server: Server;
let port: number;
const source = Buffer.from("export const greeting = 'Hello travelers';\n".repeat(1000));
const css = Buffer.from(".card { color: gold; background: black; }\n".repeat(100));

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "asset-compression-"));
  assets = path.join(directory, "assets");
  await mkdir(path.join(assets, "nested"), { recursive: true });
  await Promise.all([
    writeFile(path.join(assets, "app.js"), source),
    writeFile(path.join(assets, "nested", "app.css"), css),
    writeFile(path.join(assets, "tiny.js"), "export default 1;"),
    writeFile(path.join(assets, "image.webp"), Buffer.alloc(2048)),
    writeFile(path.join(assets, ".hidden.js"), source),
    writeFile(path.join(directory, "private.js"), source),
    writeFile(path.join(directory, "private.js.br"), "not public"),
  ]);
  await precompressAssets(assets);

  const app = express();
  app.use("/assets", (_req, res, next) => { res.vary("Origin"); next(); });
  app.use("/assets", serveCompressedAssets(assets));
  app.use("/assets", express.static(assets, { maxAge: "1y", immutable: true }));
  app.get("/api/fixture", (_req, res) => res.json({ private: "fictional" }));
  app.get("/", (_req, res) => res.type("html").send("<p>Public landing</p>"));
  app.use((error: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error.status || 500).send("Not available");
  });
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  port = address.port;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  if (directory) await rm(directory, { recursive: true, force: true });
});

function request(url: string, headers: http.OutgoingHttpHeaders = {}, method = "GET") {
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: Buffer }>((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path: url, headers, method }, response => {
      const chunks: Buffer[] = [];
      response.on("data", chunk => chunks.push(Buffer.from(chunk)));
      response.on("end", () => resolve({
        status: response.statusCode!,
        headers: response.headers,
        body: Buffer.concat(chunks),
      }));
      response.on("error", reject);
    });
    req.on("error", reject);
    req.end();
  });
}

test("build creates lossless, smaller Brotli and gzip variants, including nested CSS", async () => {
  for (const [file, original] of [["app.js", source], ["nested/app.css", css]] as const) {
    const br = await readFile(path.join(assets, `${file}.br`));
    const gz = await readFile(path.join(assets, `${file}.gz`));
    assert.deepEqual(brotliDecompressSync(br), original);
    assert.deepEqual(gunzipSync(gz), original);
    assert.ok(br.length < original.length && gz.length < original.length);
  }
  for (const file of ["tiny.js.br", "tiny.js.gz", "image.webp.br", "image.webp.gz"]) {
    await assert.rejects(stat(path.join(assets, file)), { code: "ENOENT" });
  }
});

test("Brotli response keeps the original MIME type, cache policy and all Vary values", async () => {
  const response = await request("/assets/app.js?version=test", { "Accept-Encoding": "br, gzip" });
  assert.equal(response.status, 200);
  assert.equal(response.headers["content-encoding"], "br");
  assert.match(response.headers["content-type"]!, /javascript/);
  assert.match(response.headers["cache-control"]!, /max-age=31536000/);
  assert.match(response.headers["cache-control"]!, /immutable/);
  assert.match(response.headers.vary!, /Origin/);
  assert.match(response.headers.vary!, /Accept-Encoding/);
  assert.deepEqual(brotliDecompressSync(response.body), source);
});

test("encoding weights are respected and gzip works for clients without Brotli", async () => {
  for (const encoding of ["gzip", "gzip, br", "br;q=0.2, gzip;q=1, identity;q=0", "br;q=0, gzip"]) {
    const response = await request("/assets/app.js", { "Accept-Encoding": encoding });
    assert.equal(response.headers["content-encoding"], "gzip");
    assert.deepEqual(gunzipSync(response.body), source);
  }
});

test("identity and absent Accept-Encoding use the uncompressed asset and still vary", async () => {
  for (const headers of [{}, { "Accept-Encoding": "br;q=0, gzip;q=0, identity" }, { "Accept-Encoding": "br;q=0.2, gzip;q=0.3, identity;q=1" }]) {
    const response = await request("/assets/app.js", headers);
    assert.equal(response.status, 200);
    assert.equal(response.headers["content-encoding"], undefined);
    assert.deepEqual(response.body, source);
    assert.match(response.headers.vary!, /Accept-Encoding/);
  }
});

test("nested CSS is served compressed with CSS MIME type", async () => {
  const response = await request("/assets/nested/app.css", { "Accept-Encoding": "br" });
  assert.equal(response.headers["content-encoding"], "br");
  assert.match(response.headers["content-type"]!, /text\/css/);
  assert.deepEqual(brotliDecompressSync(response.body), css);
});

test("small files without variants fall back to the original", async () => {
  const response = await request("/assets/tiny.js", { "Accept-Encoding": "br, gzip" });
  assert.equal(response.status, 200);
  assert.equal(response.headers["content-encoding"], undefined);
  assert.equal(response.body.toString(), "export default 1;");
});

test("HEAD and conditional requests retain standard caching behavior", async () => {
  const get = await request("/assets/app.js", { "Accept-Encoding": "br" });
  const head = await request("/assets/app.js", { "Accept-Encoding": "br" }, "HEAD");
  assert.equal(head.status, 200);
  assert.equal(head.headers["content-encoding"], "br");
  assert.equal(Number(head.headers["content-length"]), get.body.length);
  assert.equal(head.body.length, 0);
  const cached = await request("/assets/app.js", {
    "Accept-Encoding": "br",
    "If-None-Match": get.headers.etag!,
  });
  assert.equal(cached.status, 304);
  assert.equal(cached.body.length, 0);
});

test("range requests preserve identity bytes instead of slicing compressed code", async () => {
  const response = await request("/assets/app.js", { "Accept-Encoding": "br", Range: "bytes=0-19" });
  assert.equal(response.status, 206);
  assert.equal(response.headers["content-encoding"], undefined);
  assert.equal(response.headers["content-range"], `bytes 0-19/${source.length}`);
  assert.deepEqual(response.body, source.subarray(0, 20));
});

test("missing, hidden and escaping paths cannot serve compressed private files", async () => {
  for (const url of ["/assets/missing.js", "/assets/.hidden.js", "/assets/%2e%2e%2fprivate.js", "/assets/%ZZ.js"]) {
    const response = await request(url, { "Accept-Encoding": "br, gzip" });
    assert.ok(response.status >= 400, `${url} must fail`);
    assert.equal(response.headers["content-encoding"], undefined);
    assert.notDeepEqual(response.body, source);
  }
});

test("API responses and HTML remain outside asset compression", async () => {
  const api = await request("/api/fixture", { "Accept-Encoding": "br, gzip" });
  assert.equal(api.headers["content-encoding"], undefined);
  assert.deepEqual(JSON.parse(api.body.toString()), { private: "fictional" });
  const html = await request("/", { "Accept-Encoding": "br, gzip" });
  assert.equal(html.headers["content-encoding"], undefined);
  assert.equal(html.body.toString(), "<p>Public landing</p>");
});