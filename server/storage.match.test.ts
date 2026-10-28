import assert from "node:assert/strict";
import { test } from "node:test";
import { EndedMatchConnectionError, resolveMatchTransition } from "./matchTransitions";

function match(id: number, user1Id: string, user2Id: string, status: string) {
  return {
    id,
    user1Id,
    user2Id,
    status,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
  } as any;
}

test("repeating an outgoing pending connection returns the existing row", () => {
  const existing = match(1, "sender", "recipient", "pending");
  assert.deepEqual(resolveMatchTransition("sender", "recipient", [existing]), {
    action: "return",
    match: existing,
    isMatch: false,
  });
});

test("a reverse pending connection is accepted as a mutual match", () => {
  const incoming = match(2, "recipient", "sender", "pending");
  assert.deepEqual(resolveMatchTransition("sender", "recipient", [incoming]), {
    action: "accept",
    match: incoming,
  });
});

test("an already matched connection is returned without another transition", () => {
  const existing = match(3, "recipient", "sender", "matched");
  assert.deepEqual(resolveMatchTransition("sender", "recipient", [existing]), {
    action: "return",
    match: existing,
    isMatch: true,
  });
});

test("ended connections are not reopened by reverse auto-accept", () => {
  const ended = match(4, "sender", "recipient", "ended");
  const incoming = match(5, "recipient", "sender", "pending");
  assert.throws(
    () => resolveMatchTransition("sender", "recipient", [ended, incoming]),
    EndedMatchConnectionError,
  );
});

test("a new connection is represented by an insert transition", () => {
  assert.deepEqual(resolveMatchTransition("sender", "recipient", []), { action: "insert" });
});