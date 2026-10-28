import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { createMessageNotifier, emailNoticeEligible, MESSAGE_EMAIL_COOLDOWN_MS, type NoticeState, type MessageNotice } from "./messageNotices";
import { MessageEmailOption } from "../client/src/components/MessageEmailOption";
import { parseNotificationPreferences } from "@shared/notification-preferences";
import { messageNoticeCopy } from "@shared/message-notice-copy";
import { createNotificationPreferencesHandlers } from "./notificationPreferences";
import { toCurrentUser } from "./publicUser";

const instant = new Date("2026-10-12T12:00:00Z");
const chat: MessageNotice = { kind: "chat", recipientId: "fictional-recipient", senderId: "fictional-sender", sourceId: 987 };
function state(patch: Partial<NoticeState> = {}): NoticeState {
  return { authorized: true, unread: true, banned: false, email: "fictional@example.invalid", emailVerified: true,
    preferences: JSON.stringify({ messages: true, messageEmails: true, interfaceLanguage: "es", customOptOut: false }), ...patch };
}
function fixture(initial = state(), changes: { production?: boolean; ready?: boolean; failPush?: boolean; failEmail?: boolean; onWait?: () => void } = {}) {
  let current = initial;
  const pushes: unknown[] = [], emails: { address: string; title: string; body: string; path: string }[] = [];
  const notifier = createMessageNotifier({
    read: async () => current,
    claim: async (_input, now) => {
      // No await before this update: model the production recipient row lock.
      if (!emailNoticeEligible(current, now)) return null;
      const result = { ...current };
      current = { ...current, preferences: JSON.stringify({
        ...parseNotificationPreferences(current.preferences), messageEmailNoticeAt: now.toISOString(),
      }) };
      return result;
    },
    push: async (...args) => { pushes.push(args); if (changes.failPush) throw Error("Fixture push rejection"); },
    email: async (address, title, body, path) => { emails.push({ address, title, body, path }); if (changes.failEmail) throw Error("Fixture email rejection"); },
    production: changes.production ?? true, emailReady: () => changes.ready ?? true,
    now: () => instant, wait: async () => { changes.onWait?.(); },
  });
  return { notifier, pushes, emails, get: () => current, set: (value: NoticeState) => { current = value; } };
}
test("message emails are default-off and preserve unrelated opt-outs and extensions", () => {
  assert.equal(parseNotificationPreferences(null).messageEmails, false);
  const f = fixture(state({ preferences: '{"messages":true,"interfaceLanguage":"fr","customOptOut":false}' }));
  return f.notifier(chat).then(() => { assert.equal(f.emails.length, 0); assert.equal(f.pushes.length, 1); });
});
test("owner DTO exposes email verification separately from selfie verification, never credential tokens", () => {
  const own = toCurrentUser({ id: "fictional", emailVerified: "true", isVerified: "false",
    emailVerificationToken: "fictional-token-never-exposed" }, null, []);
  assert.equal(own.emailVerified, "true"); assert.equal(own.isVerified, "false");
  assert(!JSON.stringify(own).includes("fictional-token-never-exposed"));
});
test("unread chat and administrator messages trigger private, localized email and push notices", async () => {
  for (const kind of ["chat", "admin"] as const) {
    const f = fixture();
    await f.notifier(kind === "chat" ? chat : { kind, recipientId: chat.recipientId, sourceId: 988 });
    assert.equal(f.pushes.length, 1); assert.equal(f.emails.length, 1);
    assert.equal(f.emails[0].address, "fictional@example.invalid");
    assert.equal(f.emails[0].title, messageNoticeCopy.es.title);
    assert(f.emails[0].body.includes(messageNoticeCopy.es.footer));
    assert.equal(f.emails[0].path, kind === "chat" ? "/matches" : "/");
    assert(!f.emails[0].body.includes("fictional-sender"));
    assert(!f.emails[0].body.includes("987"));
    assert.equal(JSON.parse(f.get().preferences!).customOptOut, false);
  }
});
test("disabled, banned, blocked/ended/foreign or already-read messages send no notices", async () => {
  for (const patch of [{ authorized: false }, { unread: false }, { banned: true }, { preferences: '{"messages":false,"messageEmails":true}' }, { preferences: '{"messages":"invalid"}' }]) {
    const f = fixture(state(patch)); await f.notifier(chat);
    assert.equal(f.emails.length, 0); assert.equal(f.pushes.length, 0);
  }
});
test("unverified/missing email, missing provider configuration and development never send emails", async () => {
  for (const f of [fixture(state({ emailVerified: false })), fixture(state({ email: null })), fixture(state(), { ready: false }), fixture(state(), { production: false })]) {
    await f.notifier(chat); assert.equal(f.emails.length, 0); assert.equal(f.pushes.length, 1);
  }
});
test("recheck unread state and preferences before mailing someone in the open conversation", async () => {
  for (const update of [{ unread: false }, { preferences: '{"messages":false,"messageEmails":true}' }, { emailVerified: false }, { authorized: false }]) {
    const f = fixture(state(), { onWait: () => f.set(state(update)) });
    await f.notifier(chat); assert.equal(f.emails.length, 0);
  }
});
test("concurrent messages across chats/admin sources share one persistent 15-minute email cap", async () => {
  const f = fixture();
  await Promise.all(Array.from({ length: 30 }, (_, index) => f.notifier(index % 2 ? chat : { kind: "admin", recipientId: chat.recipientId, sourceId: 988 })));
  assert.equal(f.emails.length, 1);
  assert.equal(emailNoticeEligible(f.get(), new Date(instant.getTime() + MESSAGE_EMAIL_COOLDOWN_MS - 1)), false);
  assert.equal(emailNoticeEligible(f.get(), new Date(instant.getTime() + MESSAGE_EMAIL_COOLDOWN_MS)), true);
  assert.throws(() => emailNoticeEligible(state({ preferences: '{"messageEmails":true,"messageEmailNoticeAt":"invalid"}' }), instant));
});
test("provider failures do not reject the saved message, retry-storm or suppress the other channel", async () => {
  const pushFailure = fixture(state(), { failPush: true }); await pushFailure.notifier(chat);
  assert.equal(pushFailure.emails.length, 1);
  const emailFailure = fixture(state(), { failEmail: true });
  await assert.doesNotReject(emailFailure.notifier(chat));
  await emailFailure.notifier(chat); assert.equal(emailFailure.emails.length, 1);
});
test("API enforces verified email for opt-in but always allows opt-out without clobbering other settings", async () => {
  let verified = false, saved = '{"messages":false,"interfaceLanguage":"sv","customOptOut":false}';
  const handlers = createNotificationPreferencesHandlers({
    read: async () => ({ email: "fictional@example.invalid", emailVerified: verified ? "true" : "false", notificationPrefs: saved }),
    write: async (_id, value) => { saved = value; },
  });
  async function update(body: unknown, authenticated = true) {
    let status = 200;
    const res = { sendStatus(code: number) { status = code; }, status(code: number) { status = code; return this; }, json() {} };
    await handlers.update({ body, user: { id: "fictional" }, isAuthenticated: () => authenticated } as any, res as any, () => {});
    return status;
  }
  assert.equal(await update({ messageEmails: true }, false), 401);
  assert.equal(await update({ messageEmails: true }), 409);
  verified = true; assert.equal(await update({ messageEmails: true }), 200);
  assert.equal(JSON.parse(saved).messages, false); assert.equal(JSON.parse(saved).customOptOut, false);
  verified = false; assert.equal(await update({ messageEmails: false }), 200);
  assert.equal(JSON.parse(saved).messageEmails, false);
  assert.equal(await update({ messageEmailNoticeAt: instant.toISOString() }), 400);
});
test("opt-in UI covers all languages, failures and account verification without silently checking consent", () => {
  for (const language of ["en", "es", "fr", "sv"] as const) {
    const base = { language, checked: false, pending: false, failed: false, verified: true, hasEmail: true, messagesEnabled: true, onChange: () => { throw Error("Render cannot opt in"); } };
    const html = renderToStaticMarkup(<MessageEmailOption {...base} />);
    assert(html.includes(messageNoticeCopy[language].label)); assert(html.includes('aria-checked="false"'));
    assert(!html.includes('disabled=""'));
    for (const patch of [{ pending: true }, { failed: true }, { verified: false }, { hasEmail: false }, { messagesEnabled: false }]) {
      assert(renderToStaticMarkup(<MessageEmailOption {...base} {...patch} />).includes('disabled=""'));
    }
    assert(!renderToStaticMarkup(<MessageEmailOption {...base} checked messagesEnabled={false} verified={false} />).includes('disabled=""'));
  }
});
test("real routes preserve authentication, message save and scope, then await notification delivery", () => {
  const routes = readFileSync("server/routes.ts", "utf8");
  assert(routes.includes('await notifyMessageRecipient({ kind: "chat", recipientId, senderId: req.user!.id, sourceId: message.id })'));
  assert(routes.includes('await notifyMessageRecipient({ kind: "admin", recipientId: userId, sourceId: notice.id })'));
  assert(routes.includes("'/api/admin/send-user-message', requireAdmin"));
  const repo = readFileSync("server/messageNoticesRepository.ts", "utf8");
  for (const guard of ['query.for("update")', 'message.status === "matched"', "blockedUsers.userId", "messages.readAt", "notifications.userId", "...prefs, messageEmailNoticeAt"]) assert(repo.includes(guard));
});
