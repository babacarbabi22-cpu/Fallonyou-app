import { test } from "node:test";
import assert from "node:assert/strict";
import { registrationErrors, registrationResponseErrors } from "./registration-validation";
import { registrationCopy } from "../client/src/lib/registration-copy";

const valid = { firstName: "Élodie", email: "fixture@example.invalid", password: "Fictional123" };
test("registration accepts international names and validates all required fields together", () => {
  for (const firstName of ["Élodie", "李", "Anne-Marie", "O’Neil"]) assert.deepEqual(registrationErrors({ ...valid, firstName }), {});
  assert.deepEqual(registrationErrors({}), { firstName: "NAME_REQUIRED", email: "EMAIL_REQUIRED", password: "PASSWORD_REQUIRED" });
  for (const firstName of ["Two Names", " Name", "Name\t", "Name\u200b"]) {
    assert.equal(registrationErrors({ ...valid, firstName }).firstName, "NAME_INVALID");
  }
  assert.equal(registrationErrors({ ...valid, password: "a".repeat(72) }).password, undefined);
  assert.equal(registrationErrors({ ...valid, password: "a".repeat(73) }).password, "PASSWORD_TOO_LONG");
});
test("server field errors are allowlisted and never rendered as raw server strings", () => {
  assert.deepEqual(registrationResponseErrors({ fieldErrors: { email: "Database secret", password: "EMAIL_REGISTERED" } }), {});
  assert.deepEqual(registrationResponseErrors({ error: "Email already registered" }), { email: "EMAIL_REGISTERED" });
  assert.deepEqual(registrationResponseErrors({ code: "PASSWORD_TOO_LONG" }), { password: "PASSWORD_TOO_LONG" });
  for (const data of [null, [], "invalid", { error: "private database error" }]) assert.deepEqual(registrationResponseErrors(data), {});
});
test("all four languages include every field error and form instruction", () => {
  for (const copy of Object.values(registrationCopy)) {
    assert.deepEqual(Object.keys(copy.errors).sort(), [
      "NAME_REQUIRED", "NAME_INVALID", "EMAIL_REQUIRED", "EMAIL_INVALID",
      "EMAIL_REGISTERED", "PASSWORD_REQUIRED", "PASSWORD_SHORT", "PASSWORD_TOO_LONG",
    ].sort());
    for (const value of [...Object.values(copy.errors), copy.nameHint, copy.emailHint, copy.passwordHint, copy.loginAction, copy.rateLimit]) {
      assert.ok(value.length > 5);
    }
  }
});
