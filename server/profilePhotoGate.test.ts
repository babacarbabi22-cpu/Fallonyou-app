import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { hasProfilePhoto } from "../shared/profile-photo";
import { createProfilePhotoGate } from "./profilePhotoGate";
import { toCurrentUser } from "./publicUser";

test("existing account photo survives the actual owner DTO and satisfies the access gate", () => {
  const account = { id: "fictional-existing-user", profileImageUrl: null };
  const photo = { id: 123, url: "/fictional/existing-photo.webp", type: "image", userId: "private-owner" };
  const response = toCurrentUser(account, { bio: "Fictional profile" }, [photo]);
  assert.equal(hasProfilePhoto(response), true);
  assert.equal(response.photos.find(item => item.type === "image")?.url, photo.url);
  assert(!JSON.stringify(response).includes("private-owner"));
  assert.equal(hasProfilePhoto(toCurrentUser(account, {}, [{ ...photo, type: "video" }])), false);
  assert.equal(hasProfilePhoto(toCurrentUser(account, {}, [])), false);
  const authSource = readFileSync("server/emailAuth.ts", "utf8");
  assert(authSource.includes("db.select(currentPhotoColumns).from(photos)"));
});

test("a saved image or avatar is required; videos and empty URLs do not qualify", () => {
  assert.equal(hasProfilePhoto(null), false);
  assert.equal(hasProfilePhoto({ photos: [] }), false);
  assert.equal(hasProfilePhoto({ photos: [{ type: "video", url: "/fictional/video" }] }), false);
  assert.equal(hasProfilePhoto({ photos: [{ type: "image", url: " " }] }), false);
  assert.equal(hasProfilePhoto({ photos: [{ type: "image", url: "/fictional/photo" }] }), true);
  assert.equal(hasProfilePhoto({ profileImageUrl: "/fictional/avatar" }), true);
});

async function runGate(path: string, options: { photo?: boolean; authenticated?: boolean; fail?: boolean } = {}) {
  let status = 200;
  let payload: any;
  let nextCalled = false;
  let nextError: unknown;
  let checked = false;
  const gate = createProfilePhotoGate(async id => {
    assert.equal(id, "fictional-user");
    checked = true;
    if (options.fail) throw new Error("fictional database failure");
    return options.photo === true;
  });
  await gate({
    path, user: { id: "fictional-user" }, isAuthenticated: () => options.authenticated !== false,
  } as any, {
    status(code: number) { status = code; return this; },
    json(value: any) { payload = value; return this; },
  } as any, error => { nextCalled = true; nextError = error; });
  return { status, payload, nextCalled, nextError, checked };
}

test("missing photo blocks profile creation and all community API families", async () => {
  for (const path of ["/api/profile", "/api/users", "/api/events", "/api/matches", "/api/messages/12", "/api/layovers", "/api/language-exchange", "/api/trips"]) {
    const result = await runGate(path);
    assert.equal(result.status, 403, path);
    assert.equal(result.payload.code, "PROFILE_PHOTO_REQUIRED");
    assert.equal(result.nextCalled, false);
  }
});

test("photo upload, consent, account deletion and preferences remain available without a photo", async () => {
  for (const path of ["/api/photos", "/api/photos/12", "/api/profile-image", "/api/accept-terms", "/api/user/delete-account", "/api/notifications/preferences"]) {
    const result = await runGate(path);
    assert.equal(result.nextCalled, true, path);
    assert.equal(result.checked, false);
  }
});

test("photographed members pass; DB failures never grant access", async () => {
  assert.equal((await runGate("/api/profile", { photo: true })).nextCalled, true);
  const failure = await runGate("/api/events", { fail: true });
  assert(failure.nextError instanceof Error);
  assert.equal((await runGate("/support")).checked, false);
  // Anonymous requests still go through each route's own authentication policy.
  assert.equal((await runGate("/api/users", { authenticated: false })).checked, false);
});

test("onboarding no longer shows or overwrites the optional help preferences", () => {
  const source = readFileSync("client/src/pages/OnboardingPage.tsx", "utf8");
  assert(!source.includes("Quiero ayudar a todos"));
  assert(!source.includes("wantToHelp"));
  assert(!source.includes("helpWith"));
  assert(source.includes("if (!photoSaved || photoSaving || isUploading) return;"));
  const app = readFileSync("client/src/App.tsx", "utf8");
  assert(app.includes("!user.profile || !hasProfilePhoto(user)"));
});

test("profile details are optional: only a saved photo and idle upload/save are needed to continue", () => {
  const source = readFileSync("client/src/pages/OnboardingPage.tsx", "utf8");
  assert(source.includes("disabled={isPending || isUploading || photoSaving || !photoSaved}"));
  assert(source.includes("displayName: profileData.displayName.trim() || undefined"));
  for (const field of ["displayName", "bio", "age", "gender"]) {
    assert(source.includes(`{t.profile.${field}} {t.onboarding.optionalDetail}`), field);
  }
  assert(!source.includes("!profileData.bio"));
  assert(!source.includes("!profileData.displayName.trim()"));
  const translations = readFileSync("client/src/lib/i18n.tsx", "utf8");
  for (const label of ["(opcional)", "(optional)", "(facultatif)", "(valfritt)"]) {
    assert(translations.includes(`optionalDetail: "${label}"`), label);
  }
});
