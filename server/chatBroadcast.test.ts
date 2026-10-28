import assert from "node:assert/strict";
import test from "node:test";
import { broadcastAuthorized, type ChatBroadcastRecipient } from "./chatBroadcast";

interface MockRecipient extends ChatBroadcastRecipient {
  id: string;
  sessionId: string;
  matchIds: Set<number>;
  received: string[];
  closed?: number;
}

function recipient(id: string, sessionId: string): MockRecipient {
  return {
    id,
    sessionId,
    matchIds: new Set([42]),
    readyState: 1,
    received: [],
    send(data) { this.received.push(data); },
    close(code = 1000) { this.closed = code; this.readyState = 3; },
  };
}

test("broadcast revalidates passive recipients: revoked sessions and banned users are removed", async () => {
  const sender = recipient("sender", "s");
  const revoked = recipient("revoked", "r");
  const banned = recipient("banned", "b");
  const blocked = recipient("blocked", "x");
  const stillValid = recipient("valid", "v");
  const sessionIds = new Set(["s", "b", "x", "v"]);
  const bannedUsers = new Set(["banned"]);
  const currentMatches = new Map([[42, { status: "matched", members: new Set(["sender", "revoked", "banned", "blocked", "valid"]) }]]);
  const blocks = new Set(["sender:blocked"]);
  const recipients = [sender, revoked, banned, blocked, stillValid];
  const remove = (client: MockRecipient, code: number, reason: string) => {
    client.matchIds.delete(42);
    client.close(code, reason);
  };

  await broadcastAuthorized(
    recipients,
    sender,
    { type: "message", matchId: 42 },
    1,
    async (client) => {
      const match = currentMatches.get(42);
      const blocked = blocks.has(`sender:${client.id}`) || blocks.has(`${client.id}:sender`);
      return sessionIds.has(client.sessionId) &&
        !bannedUsers.has(client.id) &&
        client.matchIds.has(42) &&
        match?.status === "matched" &&
        !!match.members.has(client.id) &&
        !blocked;
    },
    remove,
  );

  assert.equal(revoked.closed, 4003);
  assert.equal(banned.closed, 4003);
  assert.equal(blocked.closed, 4003);
  assert.equal(revoked.received.length, 0);
  assert.equal(banned.received.length, 0);
  assert.equal(blocked.received.length, 0);
  assert.equal(stillValid.closed, undefined);
  assert.equal(JSON.parse(stillValid.received[0]).type, "message");
});

test("broadcast contains authorization and send failures without rejecting", async () => {
  const bad = recipient("bad", "bad");
  const recipients = [bad];
  await assert.doesNotReject(() => broadcastAuthorized(
    recipients,
    undefined,
    { type: "typing" },
    1,
    async () => { throw new Error("mock db failure"); },
    (client, code) => client.close(code),
  ));
  assert.equal(bad.closed, 1011);
});