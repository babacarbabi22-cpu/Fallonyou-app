import assert from "node:assert/strict";
import { test } from "node:test";
import { Readable } from "node:stream";
import {
  canReadMedia,
  createImageUploadProof,
  createImageUploadTicket,
  ImageUploadClaims,
  isOwnedCompletedImageUpload,
  verifyImageUploadProof,
} from "./mediaSecurity";
import { createUploadPutHandler } from "./uploadPutHandler";

const secret = "test-only-session-secret";
const imageBytes = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9,
]);

function claimsFor(userId = "owner"): ImageUploadClaims {
  return {
    version: 1,
    userId,
    objectPath: "/objects/uploads/6d4f71f2-d69e-4eea-9565-45d1f8392830",
    contentType: "image/jpeg",
    size: imageBytes.length,
    expiresAt: Date.now() + 60_000,
  };
}

function mockRequest({
  claims,
  userId = claims.userId,
  bytes = imageBytes,
  length = claims.size,
  contentType = claims.contentType,
  ticket = createImageUploadTicket(claims, secret),
}: {
  claims: ImageUploadClaims;
  userId?: string;
  bytes?: Buffer;
  length?: number;
  contentType?: string;
  ticket?: string;
}) {
  const req: any = Readable.from([bytes]);
  req.user = { id: userId };
  const pathParts = claims.objectPath.split("/");
  req.params = { objectId: pathParts[pathParts.length - 1] };
  req.query = { ticket };
  req.get = (name: string) => ({
    "content-length": String(length),
    "content-type": contentType,
    "content-encoding": undefined,
  }[name.toLowerCase()]);
  return req;
}

function mockResponse() {
  const response: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return response;
}

async function invoke(req: any, writer: (claims: ImageUploadClaims, bytes: Buffer) => Promise<void>) {
  const response = mockResponse();
  const handler = createUploadPutHandler({ secret, writeObject: writer });
  await (handler as any)(req, response, () => {});
  return response;
}

test("PUT rejects forged and non-owner tickets before storage writes", async () => {
  const claims = claimsFor();
  let writes = 0;
  const writer = async () => { writes += 1; };
  const forged = await invoke(mockRequest({ claims, ticket: `${createImageUploadTicket(claims, secret)}x` }), writer);
  const foreign = await invoke(mockRequest({ claims, userId: "intruder" }), writer);
  assert.equal(forged.statusCode, 403);
  assert.equal(foreign.statusCode, 403);
  assert.equal(writes, 0);
});

test("oversized or malformed body is rejected before any cloud write", async () => {
  const claims = claimsFor();
  let writes = 0;
  const writer = async () => { writes += 1; };
  const declaredOversize = await invoke(mockRequest({
    claims,
    length: claims.size + 1,
    bytes: Buffer.concat([imageBytes, Buffer.from([0x00])]),
  }), writer);
  const bodyOversize = await invoke(mockRequest({
    claims,
    bytes: Buffer.concat([imageBytes, Buffer.from([0x00])]),
    length: claims.size,
  }), writer);
  const invalidRaster = await invoke(mockRequest({
    claims,
    bytes: Buffer.from("<svg></svg>xx"),
    length: claims.size,
  }), writer);
  assert.equal(declaredOversize.statusCode, 413);
  assert.equal(bodyOversize.statusCode, 413);
  assert.equal(invalidRaster.statusCode, 415);
  assert.equal(writes, 0);
});

test("valid upload persists private owner proof usable after handler/service restart", async () => {
  const claims = claimsFor();
  const persistedAcl = new Map<string, any>();
  const response = await invoke(mockRequest({ claims }), async (verifiedClaims, bytes) => {
    assert.deepEqual(bytes, imageBytes);
    persistedAcl.set(verifiedClaims.objectPath, {
      owner: verifiedClaims.userId,
      visibility: "private",
      contentType: verifiedClaims.contentType,
      size: verifiedClaims.size,
      uploadProof: createImageUploadProof(verifiedClaims, secret),
    });
  });
  assert.equal(response.statusCode, 201);

  // Simulate a fresh process: authorization uses only persisted ACL metadata,
  // not the ticket or any in-memory allocation state.
  const acl = persistedAcl.get(claims.objectPath);
  assert.equal(verifyImageUploadProof({
    owner: acl.owner,
    objectPath: claims.objectPath,
    contentType: acl.contentType,
    size: acl.size,
    proof: acl.uploadProof,
  }, secret), true);
  assert.equal(isOwnedCompletedImageUpload({
    userId: "owner",
    objectPath: claims.objectPath,
    storedSize: acl.size,
    storedContentType: acl.contentType,
    policy: acl,
    secret,
  }), true);
  assert.equal(isOwnedCompletedImageUpload({
    userId: "different-account",
    objectPath: claims.objectPath,
    storedSize: acl.size,
    storedContentType: acl.contentType,
    policy: acl,
    secret,
  }), false);
  assert.equal(acl.visibility, "private");
  assert.equal(canReadMedia({
    authenticated: true,
    isPublic: false,
    isOwner: false,
    isPublishedReference: false,
    isAllowedMatchParticipant: true,
  }), true);
  assert.equal(canReadMedia({
    authenticated: true,
    isPublic: false,
    isOwner: false,
    isPublishedReference: false,
    isAllowedMatchParticipant: false,
  }), false);
});