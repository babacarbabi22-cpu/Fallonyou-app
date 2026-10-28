import assert from "node:assert/strict";
import test from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import { ageVisibilityPatchSchema, publicAgeColumn, toCurrentUser, toPublicProfile } from "./publicUser";

test("age is private by default, including legacy and malformed visibility values", () => {
  for (const showAge of [undefined, null, false, "true", 1]) {
    const result = toPublicProfile({ age: 37, bio: "Fictional", showAge } as any);
    assert.equal(Object.hasOwn(result!, "age"), false);
    assert.equal(Object.hasOwn(result!, "showAge"), false);
    assert.ok(!JSON.stringify(result).includes("37"));
    assert.equal(result?.bio, "Fictional");
  }
});

test("only an explicit boolean opt-in shares age, and opt-out removes it again", () => {
  assert.equal(toPublicProfile({ age: 37, showAge: true })?.age, 37);
  assert.equal(Object.hasOwn(toPublicProfile({ age: 37, showAge: false })!, "age"), false);
});

test("owner can still see and edit age while hidden, with adulthood confirmation unchanged", () => {
  for (const showAge of [undefined, false, true]) {
    const owner = toCurrentUser(
      { id: "fictional-owner", ageConfirmed: "true" },
      { age: 37, showAge },
      [],
    );
    assert.equal(owner.age, 37);
    assert.equal(owner.profile?.age, 37);
    assert.equal(owner.profile?.showAge, showAge === true);
    assert.equal(owner.ageConfirmed, true);
  }
});

test("PATCH visibility is strict boolean; omitted choice stays omitted", () => {
  assert.deepEqual(ageVisibilityPatchSchema.parse({ bio: "Fictional" }), {});
  for (const value of [true, false]) {
    assert.deepEqual(ageVisibilityPatchSchema.parse({ showAge: value }), { showAge: value });
  }
  for (const value of ["true", "false", 0, 1, null, [], {}]) {
    assert.equal(ageVisibilityPatchSchema.safeParse({ showAge: value }).success, false);
  }
});

test("flat public photo-directory and daily-spark selections mask age in SQL", () => {
  const query = new PgDialect().sqlToQuery(publicAgeColumn);
  assert.match(query.sql, /CASE WHEN "profiles"\."show_age" = true THEN "profiles"\."age" ELSE NULL END/);
});