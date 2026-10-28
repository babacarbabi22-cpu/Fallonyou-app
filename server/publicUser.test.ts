import assert from "node:assert/strict";
import { test } from "node:test";
import { toCurrentUser, toPublicPhoto, toPublicProfile, toPublicUser } from "./publicUser";

const syntheticSecret = "SYNTHETIC_TEST_SECRET_NOT_REAL";

test("public person DTOs allow only frontend identity, profile, and photo fields", () => {
  const person = toPublicUser({
    id: "synthetic-person-id",
    firstName: "Example",
    lastName: "Traveler",
    profileImageUrl: "/synthetic-avatar.jpg",
    isVerified: "true",
    email: syntheticSecret,
    password: syntheticSecret,
    passwordResetToken: syntheticSecret,
    emailVerificationToken: syntheticSecret,
    stripeCustomerId: syntheticSecret,
    isAdmin: "true",
    isBanned: "true",
    banReason: syntheticSecret,
    latitude: syntheticSecret,
  } as any);
  assert.deepEqual(person, {
    id: "synthetic-person-id",
    firstName: "Example",
    lastName: "Traveler",
    profileImageUrl: "/synthetic-avatar.jpg",
    isVerified: "true",
  });

  const profile = toPublicProfile({
    bio: "Synthetic public bio",
    age: 30,
    currentCity: "Example City",
    preference: syntheticSecret,
    userId: syntheticSecret,
    latitude: syntheticSecret,
    longitude: syntheticSecret,
    lastLocationAt: syntheticSecret,
    lastActive: syntheticSecret,
    incognito: true,
    internalAccountNote: syntheticSecret,
  } as any);
  assert.equal(profile?.bio, "Synthetic public bio");
  assert.equal(profile?.currentCity, "Example City");
  assert.ok(!JSON.stringify(profile).includes(syntheticSecret));
  for (const key of ["userId", "preference", "latitude", "longitude", "lastLocationAt", "lastActive", "incognito", "internalAccountNote"]) {
    assert.ok(!(key in (profile ?? {})), `public profile must omit ${key}`);
  }

  const photo = toPublicPhoto({
    id: 8,
    url: "/synthetic-photo.jpg",
    userId: syntheticSecret,
    type: syntheticSecret,
    createdAt: syntheticSecret,
  } as any);
  assert.deepEqual(photo, { id: 8, url: "/synthetic-photo.jpg" });
});

test("current-user DTO retains required self settings but never credentials or tokens", () => {
  const self = toCurrentUser({
    id: "synthetic-self-id",
    email: "self@example.test",
    firstName: "Self",
    lastName: "Traveler",
    profileImageUrl: "/synthetic-self-avatar.jpg",
    isPremium: "true",
    isVerified: "false",
    isAdmin: "false",
    ageConfirmed: "true",
    ageConfirmedAt: new Date("2024-01-01T00:00:00.000Z"),
    termsAcceptedAt: new Date("2024-01-02T00:00:00.000Z"),
    termsAcceptedVersion: "synthetic-terms-version",
    verificationStatus: "pending",
    verificationRejectedReason: "Synthetic reason",
    password: syntheticSecret,
    passwordResetToken: syntheticSecret,
    passwordResetTokenExpiry: syntheticSecret,
    emailVerificationToken: syntheticSecret,
    emailVerificationTokenExpiry: syntheticSecret,
    verificationSelfieUrl: syntheticSecret,
    stripeCustomerId: syntheticSecret,
    stripeSubscriptionId: syntheticSecret,
    isBanned: "false",
    banReason: syntheticSecret,
    isAdminSecret: syntheticSecret,
  } as any, {
    bio: "My synthetic bio",
    age: 30,
    gender: "example",
    preference: "self-setting-value",
    latitude: syntheticSecret,
    longitude: syntheticSecret,
    lastActive: syntheticSecret,
  } as any, [{
    id: 9,
    url: "/synthetic-self-photo.jpg",
    userId: syntheticSecret,
    type: syntheticSecret,
    createdAt: syntheticSecret,
  } as any]);

  assert.equal(self.email, "self@example.test");
  assert.equal(self.isAdmin, "false");
  assert.equal(self.termsAcceptedVersion, "synthetic-terms-version");
  assert.equal(self.verificationStatus, "pending");
  assert.equal(self.verificationRejectedReason, "Synthetic reason");
  assert.equal(self.ageConfirmed, true);
  assert.equal(self.profile?.bio, "My synthetic bio");
  assert.equal(self.bio, "My synthetic bio");
  assert.equal(self.profile?.preference, "self-setting-value");
  assert.equal(self.preference, "self-setting-value");
  assert.deepEqual(self.photos, [{ id: 9, url: "/synthetic-self-photo.jpg", type: null }]);

  const serialized = JSON.stringify(self);
  assert.ok(!serialized.includes(syntheticSecret));
  for (const key of [
    "password",
    "passwordResetToken",
    "passwordResetTokenExpiry",
    "emailVerificationToken",
    "emailVerificationTokenExpiry",
    "verificationSelfieUrl",
    "stripeCustomerId",
    "stripeSubscriptionId",
    "isBanned",
    "latitude",
    "longitude",
    "lastActive",
  ]) {
    assert.ok(!(key in self), `current-user response must omit ${key}`);
  }
});