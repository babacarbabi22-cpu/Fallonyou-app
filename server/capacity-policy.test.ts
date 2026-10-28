import assert from "node:assert/strict";
import test from "node:test";
import { parseMemberPage } from "./memberPaging";
import { parseChatRelayEvent } from "./chatRelay";
import { accountRateKey } from "./requestLimits";
import { broadcastAuthorized } from "./chatBroadcast";
import { parseMessageCursor } from "./messagePaging";

test("member pages are bounded and reject unsafe/repeated query parameters", () => {
  assert.deepEqual(parseMemberPage({}), { limit: 24, cursor: undefined });
  assert.deepEqual(parseMemberPage({ limit: "50", cursor: "fictional-123" }), { limit: 50, cursor: "fictional-123" });
  for (const query of [{ limit: "0" }, { limit: "51" }, { limit: "20000" }, { cursor: ["a", "b"] }, { cursor: "x' OR 1=1" }]) {
    assert.throws(() => parseMemberPage(query));
  }
});

test("older message cursors must be positive database integers", () => {
  assert.equal(parseMessageCursor(undefined), undefined);
  assert.equal(parseMessageCursor("123"), 123);
  for (const cursor of ["0", "-1", "2147483648", ["1", "2"], "x"]) assert.throws(() => parseMessageCursor(cursor));
});

test("chat relay accepts only small valid identifier-only events", () => {
  const base = { origin: "fictional-instance", matchId: 12, type: "message", messageId: 45 };
  assert.deepEqual(parseChatRelayEvent(JSON.stringify({ ...base, content: "must not propagate" })), base);
  for (const event of [{ ...base, matchId: -1 }, { ...base, messageId: undefined }, { ...base, type: "unknown" }]) {
    assert.equal(parseChatRelayEvent(JSON.stringify(event)), undefined);
  }
  assert.equal(parseChatRelayEvent("x".repeat(2000)), undefined);
  assert.equal(parseChatRelayEvent("null"), undefined);
});

test("different signed-in users on one IP have separate request budgets", () => {
  assert.notEqual(accountRateKey({ ip: "192.0.2.1", session: { userId: "fictional-a" } }), accountRateKey({ ip: "192.0.2.1", session: { userId: "fictional-b" } }));
  assert.equal(accountRateKey({ ip: "192.0.2.1" }), accountRateKey({ ip: "192.0.2.1" }));
});

test("slow chat recipients are disconnected without receiving or blocking a healthy recipient", async () => {
  const sent: string[] = [], revoked: number[] = [];
  const slow = { readyState: 1, bufferedAmount: 300_000, send: () => assert.fail("slow recipient"), close: () => {} };
  const healthy = { readyState: 1, bufferedAmount: 0, send: (data: string) => sent.push(data), close: () => {} };
  await broadcastAuthorized([slow, healthy], undefined, { type: "message" }, 1, async () => true, (_socket, code) => revoked.push(code));
  assert.deepEqual(revoked, [1013]);
  assert.equal(sent.length, 1);
});
