import test from "node:test";
import assert from "node:assert/strict";
import { connectionNotice, reminderDue, studyActivitySchema, solidarityInterestSchema } from "./engagement-policy";
import { engagementCopy } from "@shared/engagement-copy";
import { parseNotificationPreferences } from "@shared/notification-preferences";

const now = new Date("2026-10-04T18:00:00Z");
const study = { language: "fr", locale: "es", lastStartedAt: "2026-10-03T15:00:00Z" };
const prefs = (extra: object = {}) => JSON.stringify({ learningReminders: true, studyActivity: study, ...extra });

test("legacy users are not subscribed to optional learning reminders", () => {
  assert.equal(parseNotificationPreferences(null).learningReminders, false);
  assert.equal(reminderDue(null, now), null);
  assert.equal(reminderDue(prefs({ learningReminders: false }), now), null);
});
test("study reminders require real activity and respect the 24h and seven-day limits", () => {
  assert.deepEqual(reminderDue(prefs(), now), study);
  assert.equal(reminderDue(JSON.stringify({ learningReminders: true }), now), null);
  assert.equal(reminderDue(prefs({ studyActivity: { ...study, lastStartedAt: "2026-10-04T17:00:00Z" } }), now), null);
  assert.equal(reminderDue(prefs({ studyActivity: { ...study, lastStartedAt: "2026-09-01T15:00:00Z" } }), now), null);
  assert.equal(reminderDue(prefs({ studyActivity: { ...study, lastStartedAt: "bad" } }), now), null);
  assert.equal(reminderDue(prefs({ studyActivity: { ...study, lastStartedAt: "2027-01-01" } }), now), null);
});
test("persisted reminder claims and recent lesson completion prevent repeat reminders", () => {
  assert.equal(reminderDue(prefs({ studyActivity: { ...study, lastReminderAt: "2026-10-04T10:00:00Z" } }), now), null);
  assert.equal(reminderDue(prefs(), now, new Date("2026-10-04T09:00:00Z")), null);
  assert.ok(reminderDue(prefs(), now, new Date("2026-10-01T09:00:00Z")));
});
test("corrupt preferences fail explicitly rather than enabling delivery", () => {
  assert.throws(() => reminderDue("bad", now));
  assert.throws(() => connectionNotice('{"matches":"false"}', "Example", false));
});
test("connection notifications respect opt-outs, request vs confirmed state and all locales", () => {
  assert.equal(connectionNotice('{"matches":false}', "Example", false), null);
  for (const locale of ["en", "es", "fr", "sv"] as const) {
    const pending = connectionNotice(JSON.stringify({ interfaceLanguage: locale }), "Fictional traveler", false)!;
    const confirmed = connectionNotice(JSON.stringify({ interfaceLanguage: locale }), "Fictional traveler", true)!;
    assert.equal(pending.type, "connection_request");
    assert.equal(pending.title, engagementCopy[locale].requestTitle);
    assert.ok(pending.body.includes("Fictional traveler"));
    assert.equal(confirmed.type, "match");
    assert.equal(confirmed.title, engagementCopy[locale].matchTitle);
    assert.equal(pending.link, "/matches");
  }
});
test("activity data cannot grant course rewards or select another user", () => {
  assert.ok(studyActivitySchema.safeParse({ language: "fr", locale: "es", lessonId: "a1_1" }).success);
  for (const value of [
    { language: "fr", locale: "es", completed: true },
    { language: "fr", locale: "es", userId: "another" },
    { language: "javascript:alert(1)", locale: "es" },
    { language: "fr", locale: "unsupported" },
  ]) assert.equal(studyActivitySchema.safeParse(value).success, false);
});
test("solidarity ideas require bounded trimmed country and support text", () => {
  const result = solidarityInterestSchema.parse({ country: "  Senegal  ", support: "  Support a local community project  " });
  assert.equal(result.country, "Senegal");
  for (const value of [
    { country: "", support: "A good idea for a trip" },
    { country: "France", support: "short" },
    { country: "x".repeat(101), support: "A good idea for a trip" },
    { country: "France", support: "x".repeat(1001) },
    { country: "France", support: "A good idea for a trip", userId: "another" },
  ]) assert.equal(solidarityInterestSchema.safeParse(value).success, false);
});