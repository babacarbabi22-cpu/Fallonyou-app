import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalMediaAuthorization } from "./localMediaAccess";
import { canReadVerificationSelfie } from "./mediaReadPrivacy";
import { markOwnedLocalMedia, getVerifiedLocalMediaOwner } from "./localMediaOwnership";
import { privacyCopy, PRIVACY_UPDATED_AT, PRIVACY_CONTROLLER_NAME } from "../client/src/lib/privacy-copy";

const ownerId = "fixture-owner";
const filename = "a".repeat(32);
const path = `/uploads/${filename}`;

test("verification selfies: owner and active administrator only, never regular peers", () => {
  const member = { isAdmin: "false", isBanned: "false" };
  assert.equal(canReadVerificationSelfie(member, ownerId, [ownerId]), true);
  assert.equal(canReadVerificationSelfie(member, "fixture-peer", [ownerId]), false);
  assert.equal(canReadVerificationSelfie({ ...member, isAdmin: "true" }, "fixture-admin", [ownerId]), true);
  assert.equal(canReadVerificationSelfie({ isAdmin: "true", isBanned: "true" }, ownerId, [ownerId]), false);
  assert.equal(canReadVerificationSelfie(undefined, ownerId, [ownerId]), false);
});

async function request(overrides: Record<string, unknown> = {}, authenticated = true, url = `/${filename}`) {
  let status = 0, nextCalled = false, lookups = 0;
  const headers: Record<string, string> = {};
  const handler = createLocalMediaAuthorization({
    file: async () => true,
    viewer: async () => { lookups++; return { isBanned: "false" }; },
    owner: async () => undefined,
    references: async () => null,
    ...overrides,
  });
  await handler(
    { path: url, user: { id: ownerId }, isAuthenticated: () => authenticated } as any,
    { setHeader: (key: string, value: string) => { headers[key] = value; }, sendStatus: (value: number) => { status = value; } } as any,
    () => { nextCalled = true; },
  );
  return { status, nextCalled, headers, lookups };
}
test("anonymous and invalid local paths are rejected without database/file lookups", async () => {
  for (const result of [await request({}, false), await request({}, true, "/.owners/proof.json"),
    await request({}, true, "/../secret"), await request({}, true, "/nested/file")]) {
    assert.equal(result.status, 404);
    assert.equal(result.nextCalled, false);
    assert.equal(result.lookups, 0);
    assert.equal(result.headers["Cache-Control"], "private, no-store");
  }
});
test("local media: owned uploads, published member photos and conversation participants work", async () => {
  for (const overrides of [
    { owner: async () => ownerId },
    { references: async () => ({ published: true, matchParticipant: false }) },
    { references: async () => ({ published: false, matchParticipant: true }) },
    { references: async () => ({ published: false, matchParticipant: false, selfieAuthorized: true }) },
  ]) assert.equal((await request(overrides)).nextCalled, true);
});
test("local media: expired viewers, bans, absent files and unrelated private files fail closed", async () => {
  for (const overrides of [
    {}, { viewer: async () => undefined }, { viewer: async () => ({ isBanned: "true" }) },
    { file: async () => false },
    { owner: async () => "fixture-other-owner" },
    { owner: async () => ownerId, references: async () => ({ published: true, matchParticipant: true, selfieAuthorized: false }) },
  ]) {
    const result = await request(overrides);
    assert.equal(result.status, 404);
    assert.equal(result.nextCalled, false);
  }
  assert.equal((await request({ references: async () => { throw new Error("fixture failure"); } })).status, 500);
});
test("local ownership reads verify signatures and size, without deleting or changing fixture media", async () => {
  const root = await mkdtemp(join(tmpdir(), "privacy-fixture-"));
  const secret = "fictional-test-secret";
  try {
    await writeFile(join(root, filename), "fictional image data");
    assert.equal(await getVerifiedLocalMediaOwner(path, secret, root), undefined);
    await markOwnedLocalMedia(ownerId, path, secret, root);
    assert.equal(await getVerifiedLocalMediaOwner(path, secret, root), ownerId);
    assert.equal(await getVerifiedLocalMediaOwner(path, "wrong-fixture-secret", root), undefined);
    assert.equal(await readFile(join(root, filename), "utf8"), "fictional image data");
    await writeFile(join(root, filename), "tampered");
    assert.equal(await getVerifiedLocalMediaOwner(path, secret, root), undefined);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("privacy is complete in all four languages, without silently falling back to English", () => {
  assert.equal(PRIVACY_UPDATED_AT, "2026-10-02");
  const ids = privacyCopy.en.sections.map(section => section.id);
  for (const [language, copy] of Object.entries(privacyCopy)) {
    assert.equal(copy.sections.length, 9);
    assert.deepEqual(copy.sections.map(section => section.id), ids);
    for (const section of copy.sections) {
      assert(section.title.length > 0 && section.text.length > 70);
      if (language !== "en") assert.notEqual(section.text, privacyCopy.en.sections.find(other => other.id === section.id)!.text);
    }
  }
});
test("public privacy policy identifies the controller and localizes its country in every language", () => {
  assert(PRIVACY_CONTROLLER_NAME.trim().length > 0);
  assert(!/undefined|placeholder|pending/i.test(PRIVACY_CONTROLLER_NAME));
  const countries = { es: "España", en: "Spain", fr: "Espagne", sv: "Spanien" } as const;
  for (const language of Object.keys(countries) as Array<keyof typeof countries>) {
    assert(privacyCopy[language].controllerLabel.length > 0);
    assert.equal(privacyCopy[language].controllerCountry, countries[language]);
  }
});
test("iOS includes all three permission explanations and localized resources, but no GPS or tracking permission", async () => {
  const plist = await readFile("ios/App/App/Info.plist", "utf8");
  const project = await readFile("ios/App/App.xcodeproj/project.pbxproj", "utf8");
  for (const language of ["en", "es", "fr", "sv"]) {
    const strings = await readFile(`ios/App/App/${language}.lproj/InfoPlist.strings`, "utf8");
    assert(project.includes(`path = ${language}.lproj/InfoPlist.strings;`));
    for (const key of ["NSCameraUsageDescription", "NSPhotoLibraryUsageDescription", "NSMicrophoneUsageDescription"]) {
      assert(plist.includes(`<key>${key}</key>`));
      assert(strings.includes(`"${key}" = "FallOnYou`));
    }
  }
  assert(project.includes("InfoPlist.strings in Resources"));
  assert(!/NSLocation|NSUserTrackingUsageDescription/.test(plist));
});