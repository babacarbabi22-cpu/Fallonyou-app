import assert from "node:assert/strict";
import test from "node:test";
import { createMemberProfileHandler, memberConnectionStatus } from "./memberProfile";

const viewerId = "fictional-viewer";
const memberId = "fictional-member";

function fixture(options: {
  authenticated?: boolean;
  viewerPhoto?: boolean;
  missing?: boolean;
  banned?: boolean;
  blocked?: boolean;
  noPhotos?: boolean;
  avatarOnly?: boolean;
  connection?: { user1Id: string; status: string };
  fail?: boolean;
} = {}) {
  const reads: string[] = [];
  const handler = createMemberProfileHandler({
    viewerHasPhoto: async () => { reads.push("viewer"); return options.viewerPhoto !== false; },
    blockedIds: async () => new Set(options.blocked ? [memberId] : []),
    member: async () => {
      reads.push("member");
      if (options.fail) throw new Error("fictional dependency failure");
      return options.missing ? undefined : {
        id: memberId, firstName: "Fictional", isBanned: options.banned ? "true" : "false",
        profileImageUrl: options.avatarOnly ? "/fictional/avatar.webp" : null,
        email: "never-expose@example.test", password: "fictional-private-value",
      };
    },
    profile: async () => {
      reads.push("profile");
      return {
        bio: "Public fictional biography", currentCity: "Example City",
        religion: "fictional-sensitive-value", politics: "fictional-sensitive-value",
        latitude: "fictional-precise-value", longitude: "fictional-precise-value",
        userId: "fictional-private-owner",
      } as any;
    },
    photos: async () => {
      reads.push("photos");
      return options.noPhotos || options.avatarOnly ? [] : [{
        id: 123, url: "/fictional/photo.webp", userId: "fictional-private-owner",
      }];
    },
    connection: async () => { reads.push("connection"); return options.connection as any; },
  });
  const req = {
    isAuthenticated: () => options.authenticated !== false,
    user: { id: viewerId },
    params: { userId: memberId },
  };
  const output = { status: 200, json: undefined as any, headers: {} as Record<string, string> };
  const res = {
    setHeader: (key: string, value: string) => { output.headers[key] = value; },
    sendStatus: (code: number) => { output.status = code; },
    json: (data: any) => { output.json = data; },
  };
  return { handler, req, res, output, reads };
}

async function run(options: Parameters<typeof fixture>[0] = {}) {
  const f = fixture(options);
  await f.handler(f.req as any, f.res as any, (() => {}) as any);
  return f;
}

test("authentication and viewer-photo gate run before any member details are read", async () => {
  const anonymous = await run({ authenticated: false });
  assert.equal(anonymous.output.status, 401);
  assert.deepEqual(anonymous.reads, []);
  const noPhoto = await run({ viewerPhoto: false });
  assert.equal(noPhoto.output.status, 403);
  assert.deepEqual(noPhoto.reads, ["viewer"]);
});

test("self, missing, banned and blocked members cannot expose a profile", async () => {
  for (const options of [{ missing: true }, { banned: true }, { blocked: true }]) {
    const f = await run(options);
    assert.equal(f.output.status, 404);
    assert.equal(f.output.json, undefined);
    assert.ok(!f.reads.includes("profile") && !f.reads.includes("connection"));
  }
  const self = fixture();
  self.req.params.userId = viewerId;
  await self.handler(self.req as any, self.res as any, (() => {}) as any);
  assert.equal(self.output.status, 404);
  assert.deepEqual(self.reads, []);
});

test("members who removed all public photos disappear; avatar-only members still work", async () => {
  assert.equal((await run({ noPhotos: true })).output.status, 404);
  const avatar = await run({ avatarOnly: true });
  assert.equal(avatar.output.status, 200);
  assert.equal(avatar.output.json.profileImageUrl, "/fictional/avatar.webp");
  assert.deepEqual(avatar.output.json.photos, []);
});

test("member DTO is allowlisted and cannot be cached or reveal private/sensitive data", async () => {
  const f = await run();
  assert.equal(f.output.status, 200);
  assert.equal(f.output.headers["Cache-Control"], "private, no-store");
  assert.equal(f.output.json.profile.bio, "Public fictional biography");
  assert.equal(f.output.json.profile.currentCity, "Example City");
  assert.deepEqual(f.output.json.photos, [{ id: 123, url: "/fictional/photo.webp" }]);
  assert.equal(f.output.json.connectionStatus, "none");
  const serialized = JSON.stringify(f.output.json);
  for (const forbidden of ["never-expose", "fictional-private", "fictional-sensitive", "fictional-precise", "isBanned"]) {
    assert.ok(!serialized.includes(forbidden), forbidden);
  }
});

test("only outgoing requests are pending; incoming likes remain undisclosed", async () => {
  assert.equal(memberConnectionStatus(viewerId, undefined), "none");
  assert.equal(memberConnectionStatus(viewerId, { user1Id: viewerId, status: "liked" }), "pending");
  assert.equal(memberConnectionStatus(viewerId, { user1Id: memberId, status: "liked" }), "none");
  assert.equal(memberConnectionStatus(viewerId, { user1Id: memberId, status: "matched" }), "connected");
  assert.equal(memberConnectionStatus(viewerId, { user1Id: viewerId, status: "ended" }), "none");
  assert.equal((await run({ connection: { user1Id: viewerId, status: "liked" } })).output.json.connectionStatus, "pending");
});

test("dependency failures produce an explicit error, not a fake profile or reset connection", async () => {
  const f = await run({ fail: true });
  assert.equal(f.output.status, 500);
  assert.equal(f.output.json, undefined);
});