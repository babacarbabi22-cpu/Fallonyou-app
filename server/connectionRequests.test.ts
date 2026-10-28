import test from "node:test";
import assert from "node:assert/strict";
import { createConnectionRequestsHandler } from "./connectionRequests";
import { formatConnectionTime, sortConnectionsNewestFirst } from "@shared/connection-time";

function res() {
  return {
    statusCode: 200, body: undefined as any, headers: {} as Record<string, string>,
    status(code: number) { this.statusCode = code; return this; },
    sendStatus(code: number) { this.statusCode = code; return this; },
    setHeader(key: string, value: string) { this.headers[key] = value; },
    vary(value: string) { this.headers.Vary = value; },
    json(value: unknown) { this.body = value; return this; },
  };
}
const viewer = { isAuthenticated: () => true, user: { id: "fixture-owner" }, query: { userId: "unrelated" } } as any;
function row(id: number, from: string, to: string, status = "pending") {
  return { id, user1Id: from, user2Id: to, status, createdAt: new Date(`2026-10-${id < 10 ? "0" : ""}${id}T12:34:00Z`) };
}
function member(id: string) {
  return { id, firstName: "Fixture", lastName: null, profileImageUrl: null, isVerified: "false",
    email: "private@example.invalid", password: "must-not-be-returned", isBanned: "false" };
}
test("request listing rejects anonymous callers before reading", async () => {
  const reads = async (): Promise<never> => { throw new Error("must not read"); };
  const handler = createConnectionRequestsHandler("incoming", { requests: reads, blockedIds: reads, members: reads });
  const response = res();
  await handler({ isAuthenticated: () => false } as any, response as any, () => {});
  assert.equal(response.statusCode, 401);
});
test("incoming requests are session-owned, newest first and visible without a premium flag", async () => {
  const response = res();
  const handler = createConnectionRequestsHandler("incoming", {
    requests: async (id, direction) => {
      assert.equal(id, viewer.user.id); assert.equal(direction, "incoming");
      return [row(1, "old", id), row(3, "blocked", id), row(4, "banned", id),
        row(2, "new", id), row(6, "outsider", "unrelated"), row(5, "ended", id, "ended"), row(7, "missing", id)];
    },
    blockedIds: async () => new Set(["blocked"]),
    members: async ids => {
      assert.ok(!ids.includes("blocked"));
      return [member("old"), member("new"), { ...member("banned"), isBanned: "true" }];
    },
  });
  await handler(viewer, response as any, () => {});
  assert.deepEqual(response.body.map((item: any) => item.id), [2, 1]);
  assert.deepEqual(Object.keys(response.body[0].otherUser).sort(), ["firstName", "id", "isVerified", "lastName", "profileImageUrl"]);
  assert.equal(response.headers["Cache-Control"], "private, no-store");
  assert.equal(response.headers.Vary, "Cookie");
});
test("sent requests cannot include incoming, accepted, self or blocked rows", async () => {
  const handler = createConnectionRequestsHandler("sent", {
    requests: async id => [row(1, id, "target"), row(2, "sender", id), row(3, id, id), row(4, id, "accepted", "matched"), row(5, id, "blocked")],
    blockedIds: async () => new Set(["blocked"]),
    members: async ids => { assert.deepEqual(ids, ["target"]); return [member("target")]; },
  });
  const response = res();
  await handler(viewer, response as any, () => {});
  assert.deepEqual(response.body.map((item: any) => item.id), [1]);
});
test("empty requests do not read profiles; read failures are not fabricated emptiness", async () => {
  const dependencies = {
    requests: async () => [],
    blockedIds: async () => new Set<string>(),
    members: async (): Promise<never> => { throw new Error("must not read"); },
  };
  const response = res();
  await createConnectionRequestsHandler("incoming", dependencies)(viewer, response as any, () => {});
  assert.deepEqual(response.body, []);
  const failed = res();
  await createConnectionRequestsHandler("incoming", {
    ...dependencies, requests: async () => { throw new Error("private database error"); },
  })(viewer, failed as any, () => {});
  assert.equal(failed.statusCode, 500);
  assert.deepEqual(failed.body, { error: "Could not load connection requests" });
});
test("timestamps use real dates, localized date and hour; invalid timestamps never become now", () => {
  const rows = [{ id: 1, createdAt: "2026-10-01T12:00:00Z" }, { id: 2, createdAt: "invalid" },
    { id: 3, createdAt: "2026-10-01T12:00:00Z" }, { id: 4, createdAt: "2026-10-02T12:00:00Z" }];
  assert.deepEqual(sortConnectionsNewestFirst(rows).map(row => row.id), [4, 3, 1, 2]);
  assert.equal(rows[0].id, 1);
  assert.equal(formatConnectionTime("invalid", "es"), null);
  assert.equal(formatConnectionTime(null, "en"), null);
  for (const lang of ["es", "en", "fr", "sv"]) {
    const text = formatConnectionTime("2026-10-01T12:34:00Z", lang);
    assert.match(text!, /2026/);
    assert.match(text!, /:\d\d/);
  }
});
