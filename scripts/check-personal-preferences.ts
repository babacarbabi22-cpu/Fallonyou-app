// Explicitly opt-in, development-only HTTP regression. Never reuse real accounts.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "../server/db";
import { profiles, preferences, users, sessions } from "../shared/schema";
import { api } from "../shared/routes";
import { PERSONAL_PREFERENCES_CONSENT_VERSION as version } from "../shared/personal-preferences-consent";

async function run() {
  const domain = process.env.REPLIT_DEV_DOMAIN;
  assert(process.argv.includes("--fixture-test"), "Requires --fixture-test");
  assert(domain?.endsWith(".replit.dev"), "Development preview only");
  assert.notEqual(process.env.NODE_ENV, "production", "Never run against production");
  const base = `https://${domain}`;
  const id = `privacy-fixture-${randomUUID()}`;
  const email = `${id}@example.test`;
  const password = `Fictional-${randomUUID()}`;
  let cookie = "";
  let checks = 0;
  async function request(path: string, method = "GET", body?: unknown) {
    return fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", Origin: base, ...(cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  async function patch(path: string, body: unknown, status: number) {
    const response = await request(path, "PATCH", body);
    assert.equal(response.status, status, `${path}: unexpected status`);
    checks++;
    return response;
  }
  async function verifyWithdrawn() {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, id));
    const [prefs] = await db.select().from(preferences).where(eq(preferences.userId, id));
    assert.equal(profile.preference, null);
    assert.equal(profile.personalPreferencesConsentAt, null);
    assert.equal(profile.personalPreferencesConsentVersion, null);
    assert.equal(prefs.showMe, "everyone");
    checks++;
  }
  try {
    await db.insert(users).values({
      id, email, password: await bcrypt.hash(password, 10), firstName: "Fictional privacy fixture",
      emailVerified: "true", ageConfirmed: "true",
    });
    await db.insert(profiles).values({
      userId: id, age: 30, bio: "Fictional privacy fixture", religion: "FICTIONAL",
      politics: "FICTIONAL", relationshipType: "FICTIONAL",
    });
    await db.insert(preferences).values({ userId: id, showMe: "women" });
    const login = await request("/api/login", "POST", { email, password });
    assert.equal(login.status, 200, "Fixture login failed");
    cookie = login.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
    assert(cookie, "Fixture session missing");
    const initial = await request("/api/preferences");
    assert.equal((await initial.json()).showMe, "everyone", "Legacy filter must be inactive");
    checks++;
    await patch("/api/profile", { preference: "women" }, 400);
    await patch("/api/preferences", { showMe: "women" }, 400);
    await patch("/api/profile", { preference: "women", personalPreferencesConsent: true, personalPreferencesConsentVersion: "old" }, 400);
    await patch("/api/profile", { preference: "everyone", personalPreferencesConsent: true, personalPreferencesConsentVersion: version }, 200);
    const [reviewedPrefs] = await db.select().from(preferences).where(eq(preferences.userId, id));
    assert.equal(reviewedPrefs.showMe, "everyone", "New permission must not revive an unreviewed legacy filter");
    checks++;
    await patch("/api/profile", { preference: "women", personalPreferencesConsent: true, personalPreferencesConsentVersion: version }, 200);
    const current = await request(api.auth.me.path);
    const self = await current.json();
    assert.equal(self.profile.personalPreferencesConsentVersion, version);
    assert.ok(self.profile.personalPreferencesConsentAt);
    assert.equal(self.profile.preference, "women");
    checks++;
    await patch("/api/preferences", { showMe: "women" }, 200);
    for (const field of ["religion", "politics", "relationshipType"]) {
      await patch("/api/profile", { [field]: "NEW_FICTIONAL" }, 400);
    }
    await patch("/api/profile", { religion: null, politics: null, relationshipType: null }, 200);
    const [cleared] = await db.select().from(profiles).where(eq(profiles.userId, id));
    assert.equal(cleared.religion, null);
    assert.equal(cleared.politics, null);
    assert.equal(cleared.relationshipType, null);
    assert.equal(cleared.bio, "Fictional privacy fixture");
    checks++;
    await patch("/api/profile", { personalPreferencesConsent: false }, 200);
    await verifyWithdrawn();
    await patch("/api/preferences", { showMe: "women" }, 400);
    // A pending update may finish before withdrawal or fail after it, but it
    // must never restore deleted preferences once withdrawal has completed.
    await patch("/api/preferences", { showMe: "women", personalPreferencesConsent: true, personalPreferencesConsentVersion: version }, 200);
    const [withdrawal, pending] = await Promise.all([
      request("/api/profile", "PATCH", { personalPreferencesConsent: false }),
      request("/api/preferences", "PATCH", { showMe: "women" }),
    ]);
    assert.equal(withdrawal.status, 200);
    assert.ok([200, 400].includes(pending.status));
    await verifyWithdrawn();
    console.log(`Passed ${checks} HTTP/database fixture checks.`);
  } finally {
    // Exact generated owner ID only; no broad cleanup and no physical files.
    await db.transaction(async tx => {
      await tx.delete(sessions).where(sql`${sessions.sess}->'passport'->>'user' = ${id}`);
      await tx.delete(preferences).where(eq(preferences.userId, id));
      await tx.delete(profiles).where(eq(profiles.userId, id));
      await tx.delete(users).where(eq(users.id, id));
    });
    await pool.end();
    console.log("Only the generated fictional fixture was cleaned up.");
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });