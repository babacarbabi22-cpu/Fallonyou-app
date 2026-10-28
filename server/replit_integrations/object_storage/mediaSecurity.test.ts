import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canReadMedia,
  canSendChatMessage,
  isUploadOwnedBy,
  isPrivateUploadObjectPath,
  validateImageUploadMetadata,
} from "./mediaSecurity";

const validPath = "/objects/uploads/6d4f71f2-d69e-4eea-9565-45d1f8392830";

test("media authorization distinguishes public, owner, and match-participant access", () => {
  assert.equal(canReadMedia({
    authenticated: false,
    isPublic: true,
    isOwner: false,
    isPublishedReference: false,
    isAllowedMatchParticipant: false,
  }), true);
  assert.equal(canReadMedia({
    authenticated: true,
    isPublic: false,
    isOwner: true,
    isPublishedReference: false,
    isAllowedMatchParticipant: false,
  }), true);
  assert.equal(canReadMedia({
    authenticated: true,
    isPublic: false,
    isOwner: false,
    isPublishedReference: false,
    isAllowedMatchParticipant: true,
  }), true);
});

test("unknown private media is denied anonymously and to nonparticipants", () => {
  for (const authenticated of [false, true]) {
    assert.equal(canReadMedia({
      authenticated,
      isPublic: false,
      isOwner: false,
      isPublishedReference: false,
      isAllowedMatchParticipant: false,
    }), false);
  }
});

test("published profile/event media remains visible to signed-in app users only", () => {
  assert.equal(canReadMedia({
    authenticated: true,
    isPublic: false,
    isOwner: false,
    isPublishedReference: true,
    isAllowedMatchParticipant: false,
  }), true);
  assert.equal(canReadMedia({
    authenticated: false,
    isPublic: false,
    isOwner: false,
    isPublishedReference: true,
    isAllowedMatchParticipant: false,
  }), false);
});

test("chat sending requires an active match participant and no block", () => {
  assert.equal(canSendChatMessage({
    isParticipant: true,
    isActiveMatch: true,
    isBlocked: false,
  }), true);
  assert.equal(canSendChatMessage({
    isParticipant: true,
    isActiveMatch: false,
    isBlocked: false,
  }), false, "ended matches cannot send");
  assert.equal(canSendChatMessage({
    isParticipant: false,
    isActiveMatch: true,
    isBlocked: false,
  }), false);
  assert.equal(canSendChatMessage({
    isParticipant: true,
    isActiveMatch: true,
    isBlocked: true,
  }), false);
});

test("an upload allocation cannot be claimed by a different account", () => {
  assert.equal(isUploadOwnedBy("uploader-1", "uploader-1"), true);
  assert.equal(isUploadOwnedBy("uploader-2", "uploader-1"), false);
  assert.equal(isUploadOwnedBy(undefined, "uploader-1"), false);
});

test("upload metadata accepts supported raster image formats within size bounds", () => {
  assert.equal(validateImageUploadMetadata({
    name: "holiday.webp",
    size: 1024,
    contentType: "image/webp",
  }), null);
  assert.match(validateImageUploadMetadata({
    name: "../secret.svg",
    size: 10,
    contentType: "image/svg+xml",
  }) || "", /filename|JPEG/);
  assert.match(validateImageUploadMetadata({
    name: "large.png",
    size: 10 * 1024 * 1024 + 1,
    contentType: "image/png",
  }) || "", /size/);
});

test("only generated upload object paths are accepted", () => {
  assert.equal(isPrivateUploadObjectPath(validPath), true);
  assert.equal(isPrivateUploadObjectPath("/objects/../uploads/6d4f71f2-d69e-4eea-9565-45d1f8392830"), false);
  assert.equal(isPrivateUploadObjectPath("/objects/uploads/%2e%2e"), false);
  assert.equal(isPrivateUploadObjectPath("/objects/uploads/foreign-user-object"), false);
});