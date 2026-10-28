import assert from "node:assert/strict";
import test from "node:test";
import {
  isActiveChatMember,
  isAllowedBrowserOrigin,
  isSafeMutationPayload,
  isValidEmail,
  isValidName,
  isValidPassword,
  WebSocketMessageLimiter,
} from "./security";

test("CSRF origin policy rejects hostile origins and accepts same-origin requests", () => {
  assert.equal(isAllowedBrowserOrigin({
    host: "fallonyou.app",
    origin: "https://evil.example",
    "sec-fetch-site": "cross-site",
  }, true), false);
  assert.equal(isAllowedBrowserOrigin({
    host: "fallonyou.app",
    origin: "https://fallonyou.app",
    "sec-fetch-site": "same-origin",
  }, true), true);
});

test("CSRF origin policy accepts origin-less native requests but rejects untrusted forwarding", () => {
  assert.equal(isAllowedBrowserOrigin({ host: "fallonyou.app" }, true), true);
  const attackerSuppliedForwardedHost = {
    host: "fallonyou.app",
    origin: "https://attacker.example",
    "x-forwarded-host": "attacker.example",
    "sec-fetch-site": "same-origin",
  };
  assert.equal(isAllowedBrowserOrigin(attackerSuppliedForwardedHost, true), false);
});

test("authentication inputs are bounded and type-checked", () => {
  assert.equal(isValidEmail("person@example.com"), true);
  assert.equal(isValidEmail({ toString: () => "person@example.com" }), false);
  assert.equal(isValidEmail("a".repeat(250) + "@example.com"), false);
  assert.equal(isValidPassword("123456"), true);
  assert.equal(isValidPassword("x".repeat(1025)), false);
  assert.equal(isValidPassword(123456), false);
  assert.equal(isValidName("A".repeat(100)), true);
  assert.equal(isValidName("A".repeat(101)), false);
  assert.equal(isSafeMutationPayload("{}", 2), true);
  assert.equal(isSafeMutationPayload("{}", 1), false);
});

test("chat membership requires a live match, participant membership, and no block", () => {
  const active = { user1Id: "user-a", user2Id: "user-b", status: "matched" };
  assert.equal(isActiveChatMember("user-a", active, false), true);
  assert.equal(isActiveChatMember("user-c", active, false), false);
  assert.equal(isActiveChatMember("user-a", { ...active, status: "ended" }, false), false);
  assert.equal(isActiveChatMember("user-a", active, true), false);
});

test("websocket messages are bounded by a per-connection rolling window", () => {
  const limiter = new WebSocketMessageLimiter(2, 10_000, 100);
  assert.equal(limiter.allow(100), true);
  assert.equal(limiter.allow(101), true);
  assert.equal(limiter.allow(102), false);
  assert.equal(limiter.allow(10_100), true);
});