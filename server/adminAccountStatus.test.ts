import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PgDialect } from "drizzle-orm/pg-core";
import { adminAccountStatusColumns } from "./adminAccountStatus";
import { db } from "./db";
import { users } from "@shared/schema";
import { AdminAccountStatusBadges } from "../client/src/components/AdminAccountStatusBadges";
import { adminAccountStatusCopy } from "../client/src/lib/admin-account-status-copy";

test("admin credential projection returns presence only, without retrieving a hash or reset token", () => {
  assert.deepEqual(Object.keys(adminAccountStatusColumns), ["hasPassword", "hasProfilePhoto"]);
  const query = new PgDialect().sqlToQuery(adminAccountStatusColumns.hasPassword);
  assert.equal(query.sql, '("users"."password" is not null and "users"."password" <> \'\')');
  assert.deepEqual(query.params, []);
  assert(!query.sql.includes("password_reset_token"));
});

test("photo status checks both saved avatar and image rows, ignoring videos and whitespace-only URLs", () => {
  const query = new PgDialect().sqlToQuery(adminAccountStatusColumns.hasProfilePhoto);
  assert(query.sql.includes('"users"."profile_image_url"'));
  assert(query.sql.includes('select 1 from "photos"'));
  assert(query.sql.includes('"photos"."user_id" = "users"."id"'));
  assert(query.sql.includes('"photos"."type" = $1'));
  assert.equal(query.sql.split("[^[:space:]]").length - 1, 2);
  assert.deepEqual(query.params, ["image"]);
  // EXISTS checks all image rows, not only the first row or the avatar load state.
  assert(!query.sql.toLowerCase().includes("limit 1"));
  // Exercise SELECT compilation as well as the standalone SQL expression:
  // Drizzle strips nested Column qualifiers in single-table projections.
  const projected = db.select(adminAccountStatusColumns).from(users).toSQL();
  assert(projected.sql.includes('"photos"."user_id" = "users"."id"'));
  assert(projected.sql.includes('"photos"."type" = $1'));
});

test("all four account-status combinations are rendered independently in every supported language", () => {
  for (const language of Object.keys(adminAccountStatusCopy) as (keyof typeof adminAccountStatusCopy)[]) {
    const copy = adminAccountStatusCopy[language];
    for (const hasPassword of [true, false]) {
      for (const hasProfilePhoto of [true, false]) {
        const html = renderToStaticMarkup(React.createElement(AdminAccountStatusBadges, { language, hasPassword, hasProfilePhoto }));
        assert(html.includes(hasPassword ? copy.passwordPresent : copy.passwordMissing));
        assert(html.includes(hasProfilePhoto ? copy.photoPresent : copy.photoMissing));
        assert(!html.includes(hasPassword ? copy.passwordMissing : copy.passwordPresent));
        assert(!html.includes(hasProfilePhoto ? copy.photoMissing : copy.photoPresent));
        assert(html.includes('data-testid="admin-password-status"'));
        assert(html.includes('data-testid="admin-photo-status"'));
      }
    }
  }
});

test("unavailable or legacy API data is not mislabeled as a missing password or photo", () => {
  for (const value of [undefined, null]) {
    const html = renderToStaticMarkup(React.createElement(AdminAccountStatusBadges, {
      language: "es", hasPassword: value, hasProfilePhoto: value,
    }));
    assert(html.includes(adminAccountStatusCopy.es.passwordUnknown));
    assert(html.includes(adminAccountStatusCopy.es.photoUnknown));
    assert(!html.includes(adminAccountStatusCopy.es.passwordMissing));
    assert(!html.includes(adminAccountStatusCopy.es.photoMissing));
  }
});

test("new flags stay in the admin-only user-list projection, not public profile responses", () => {
  const source = readFileSync("server/routes.ts", "utf8");
  const endpoint = source.slice(source.indexOf("app.get('/api/admin/users'"), source.indexOf("// Ban a user"));
  assert(endpoint.includes("requireAdmin"));
  assert(endpoint.includes('res.setHeader("Cache-Control", "no-store")'));
  assert(endpoint.includes("...adminAccountStatusColumns"));
  assert(!endpoint.includes("password: users.password"));
  assert(!endpoint.includes("db.select()"));
  const publicSource = readFileSync("server/publicUser.ts", "utf8");
  assert(!publicSource.includes("adminAccountStatusColumns"));
  assert(!publicSource.includes("hasPassword"));
  assert(!publicSource.includes("hasProfilePhoto"));
  const adminUI = readFileSync("client/src/pages/AdminPage.tsx", "utf8");
  assert(adminUI.includes("hasPassword={user.hasPassword}"));
  assert(adminUI.includes("hasProfilePhoto={user.hasProfilePhoto}"));
});
