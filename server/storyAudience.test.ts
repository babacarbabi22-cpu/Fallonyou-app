import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { canViewStory, DEFAULT_STORY_AUDIENCE, storyAudienceSchema } from "@shared/story-audience";
import { createStoryUploadHandler } from "./storyUploadHandler";
import { createObjectMediaReadHandler } from "./objectMediaReadHandler";

test("each story's audience is independent and owners retain access", () => {
  const list = [
    { userId: "fictional-owner", audience: "connections", id: 1 },
    { userId: "fictional-owner", audience: "everyone", id: 2 },
    { userId: "fictional-peer", audience: "connections", id: 3 },
  ];
  assert.deepEqual(list.filter(s => canViewStory(s, "fictional-stranger", new Set())).map(s => s.id), [2]);
  assert.deepEqual(list.filter(s => canViewStory(s, "fictional-owner", new Set())).map(s => s.id), [1, 2]);
  assert.deepEqual(list.filter(s => canViewStory(s, "fictional-friend", new Set(["fictional-owner"]))).map(s => s.id), [1, 2]);
});

test("blocks override both audiences; absent/invalid values fail private", () => {
  assert.equal(DEFAULT_STORY_AUDIENCE, "connections");
  for (const audience of ["connections", "everyone", undefined, null, "invalid"]) {
    const story = { userId: "fictional-owner", audience };
    assert.equal(canViewStory(story, "fictional-owner", new Set()), true);
    assert.equal(canViewStory(story, "fictional-stranger", new Set(), new Set(["fictional-owner"])), false);
    assert.equal(canViewStory(story, "fictional-stranger", new Set()), audience === "everyone");
  }
  for (const value of ["public", "", ["everyone"], true, null]) assert.equal(storyAudienceSchema.safeParse(value).success, false);
});

test("bounded uploads persist chosen audience, default private, reject invalid values before writing", async t => {
  const writes: string[] = [], inserted: any[] = [];
  const app = express();
  app.use(express.json(), (req, _res, next) => {
    req.isAuthenticated = (() => req.headers["x-fictional-user"] === "fictional-owner") as any;
    req.user = { id: "fictional-owner" } as any;
    next();
  });
  app.post("/stories", createStoryUploadHandler({
    write: async owner => { writes.push(owner); return "/objects/uploads/fictional"; },
    ownsReference: async (_owner, path) => path === "/objects/uploads/owned-fixture",
    insert: async (owner, mediaUrl, caption, audience) => {
      const story = { userId: owner, mediaUrl, caption, audience };
      inserted.push(story);
      return story;
    },
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${(server.address() as any).port}/stories`;
  const headers = { "x-fictional-user": "fictional-owner" };
  for (const audience of [undefined, "connections", "everyone"]) {
    const body = new FormData();
    body.append("media", new Blob([new Uint8Array([1])], { type: "image/png" }), "fictional.png");
    body.append("caption", "Fictional test");
    if (audience) body.append("audience", audience);
    const response = await fetch(base, { method: "POST", headers, body });
    assert.equal(response.status, 200);
    const story = await response.json();
    assert.equal(story.audience, audience ?? "connections");
    assert.equal(story.userId, "fictional-owner");
  }
  const count = writes.length;
  const bad = new FormData();
  bad.append("media", new Blob([new Uint8Array([1])], { type: "image/png" }), "fictional.png");
  bad.append("audience", "public");
  assert.equal((await fetch(base, { method: "POST", headers, body: bad })).status, 400);
  assert.equal(writes.length, count);
  assert.equal(inserted.length, 3);
  const denied = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(denied.status, 401);
  const owned = await fetch(base, { method: "POST", headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ mediaUrl: "/objects/uploads/owned-fixture", audience: "everyone", userId: "forged-user" }) });
  assert.equal(owned.status, 200);
  assert.equal((await owned.json()).userId, "fictional-owner");
});

test("direct story URLs enforce audience for GET, HEAD and range requests, not only the feed", async t => {
  const story = { userId: "fictional-owner", audience: "connections" };
  const app = express();
  app.use((req, _res, next) => {
    const id = req.headers["x-fictional-user"] as string | undefined;
    req.isAuthenticated = (() => !!id) as any;
    req.user = id ? { id } as any : undefined;
    next();
  });
  app.get("/objects/story", createObjectMediaReadHandler({
    viewer: async id => ({ isBanned: id === "fictional-banned" ? "true" : "false" }),
    file: async () => ({ getMetadata: async () => [{ size: 1, contentType: "image/png" }] }) as any,
    policy: async () => ({ owner: story.userId, mediaClass: "story", size: 1, contentType: "image/png", visibility: "private" }) as any,
    verify: () => true,
    references: async (_path, viewer) => ({
      published: canViewStory(story, viewer,
        viewer === "fictional-friend" ? new Set([story.userId]) : new Set(),
        viewer === "fictional-blocked" ? new Set([story.userId]) : new Set()),
      matchParticipant: false,
    }),
    download: async (_file, _req, res) => { res.end("x"); },
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${(server.address() as any).port}/objects/story`;
  for (const id of ["fictional-stranger", "fictional-pending", "fictional-ended", "fictional-blocked", "fictional-banned"]) {
    for (const [method, range] of [["GET", false], ["HEAD", false], ["GET", true]] as const) {
      const response = await fetch(url, { method, headers: { "x-fictional-user": id, ...(range ? { Range: "bytes=0-0" } : {}) } });
      assert.equal(response.status, 404, `${id}/${method}/${range}`);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
    }
  }
  for (const id of ["fictional-owner", "fictional-friend"]) {
    assert.equal((await fetch(url, { headers: { "x-fictional-user": id } })).status, 200);
  }
  story.audience = "everyone";
  assert.equal((await fetch(url, { headers: { "x-fictional-user": "fictional-stranger" } })).status, 200);
  assert.equal((await fetch(url, { headers: { "x-fictional-user": "fictional-blocked" } })).status, 404);
  assert.equal((await fetch(url)).status, 404);
});