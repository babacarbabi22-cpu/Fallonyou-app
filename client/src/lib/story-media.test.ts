import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getStoryMediaKind } from "./story-media";
import { StoryMedia } from "../components/StoryMedia";

test("classifies response MIME before suffix and does not treat extensionless uploads as photos", () => {
  assert.equal(getStoryMediaKind("/uploads/fictional", "video/quicktime"), "video");
  assert.equal(getStoryMediaKind("/uploads/fictional", "video/mp4; codecs=avc1"), "video");
  assert.equal(getStoryMediaKind("/uploads/fictional", "image/jpeg"), "image");
  assert.equal(getStoryMediaKind("/uploads/fictional"), undefined);
  assert.equal(getStoryMediaKind("/fixture.MOV?signature=fixture"), "video");
  assert.equal(getStoryMediaKind("/fixture.png?next=video.mp4"), "image");
  assert.equal(getStoryMediaKind("/fixture.jpg", "video/mp4"), "video");
  assert.equal(getStoryMediaKind("/uploads/fictional", "application/octet-stream"), undefined);
});

const labels = { loading: "Loading fixture", error: "Fixture media failed", retry: "Retry", sound: "Enable sound" };
test("video stories render a controllable inline video, not an image; photos remain photos", () => {
  const video = renderToStaticMarkup(React.createElement(StoryMedia, { url: "/fictional.mov", labels }));
  assert.match(video, /<video/); assert.doesNotMatch(video, /<img/);
  assert.match(video, /controls=""/); assert.match(video, /playsinline=""/i);
  assert.match(video, /muted=""/); assert.match(video, /Enable sound/);
  const image = renderToStaticMarkup(React.createElement(StoryMedia, { url: "/fictional.jpg", labels }));
  assert.match(image, /<img/); assert.doesNotMatch(image, /<video/);
  const unknown = renderToStaticMarkup(React.createElement(StoryMedia, { url: "/uploads/fictional", labels }));
  assert.match(unknown, /Loading fixture/); assert.doesNotMatch(unknown, /<img/);
});