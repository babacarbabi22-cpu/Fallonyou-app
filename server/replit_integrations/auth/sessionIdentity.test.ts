import { test } from "node:test";
import assert from "node:assert/strict";
import { getSessionIdentity } from "./sessionIdentity";

test("OIDC claims produce the identity required by Passport without copying unrelated claims", () => {
  const claims = {
    sub: "fixture-user", email: "fixture@example.invalid",
    first_name: "Fixture", last_name: "Traveller", extra: "not session identity",
  };
  assert.deepEqual(getSessionIdentity(claims), {
    id: "fixture-user", email: "fixture@example.invalid",
    firstName: "Fixture", lastName: "Traveller",
  });
});

test("optional OIDC names remain nullable", () => {
  assert.deepEqual(getSessionIdentity({ sub: "fixture-user", email: "fixture@example.invalid" }), {
    id: "fixture-user", email: "fixture@example.invalid", firstName: null, lastName: null,
  });
});

test("missing or malformed mandatory OIDC claims never produce an empty authenticated user", () => {
  for (const claims of [undefined, {}, { sub: "fixture-user" },
    { sub: "", email: "fixture@example.invalid" }, { sub: 123, email: "fixture@example.invalid" },
    { sub: "fixture-user", email: null }, { sub: "fixture-user", email: " " }]) {
    assert.throws(() => getSessionIdentity(claims), /required account identity/);
  }
});