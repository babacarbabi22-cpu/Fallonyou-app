import assert from "node:assert/strict";
import test from "node:test";
import { createDiscoveryPreloader, discoveryPreloadUrls } from "./image-preload";

test("preloads at most four primary photos, prioritizing the current member", () => {
  const users = Array.from({ length: 30 }, (_, id) => ({
    photos: [{ url: `/fictional/photo-${id}.webp` }],
    profileImageUrl: `/fictional/avatar-${id}.webp`,
  }));
  assert.deepEqual(discoveryPreloadUrls(users), [29, 28, 27, 26].map(id => `/fictional/photo-${id}.webp`));
  assert.deepEqual(discoveryPreloadUrls(users.slice(0, -1)), [28, 27, 26, 25].map(id => `/fictional/photo-${id}.webp`));
});

test("uses the avatar only when there is no primary photo and deduplicates URLs", () => {
  assert.deepEqual(discoveryPreloadUrls([
    { photos: [{ url: "/fictional/a.webp" }], profileImageUrl: "/unused.webp" },
    { photos: [], profileImageUrl: "/fictional/b.webp" },
    { photos: null, profileImageUrl: "/fictional/a.webp" },
    { profileImageUrl: null },
  ]), ["/fictional/a.webp", "/fictional/b.webp"]);
});

test("empty feeds and users with no photos schedule no downloads", () => {
  assert.deepEqual(discoveryPreloadUrls([]), []);
  assert.deepEqual(discoveryPreloadUrls([{}, { photos: [] }]), []);
});

test("reuses adjacent preloads, bounds the window, prioritizes current and retries failures", () => {
  const created: Array<{ src: string; fetchPriority: string; onload: null | (() => void); onerror: null | (() => void) }> = [];
  const preloader = createDiscoveryPreloader(() => {
    const image = { src: "", fetchPriority: "", onload: null, onerror: null };
    created.push(image);
    return image as unknown as HTMLImageElement;
  });
  preloader.warm(["/a", "/b", "/c", "/d", "/e"]);
  assert.equal(created.length, 4);
  assert.equal(created[0].fetchPriority, "high");
  assert.equal(created[1].fetchPriority, "low");
  preloader.warm(["/a", "/b", "/c", "/d"]);
  assert.equal(created.length, 4);
  preloader.warm(["/b", "/c", "/d", "/e"]);
  assert.equal(created.length, 5);
  assert.equal(created[1].fetchPriority, "high");
  created[1].onerror?.();
  preloader.warm(["/b", "/c", "/d", "/e"]);
  assert.equal(created.length, 6, "a failed preload is not cached forever");
  preloader.clear();
  preloader.warm(["/b"]);
  assert.equal(created.length, 7, "page disposal clears media references");
});