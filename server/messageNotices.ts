import { parseNotificationPreferences } from "@shared/notification-preferences";
import { recipientLocale } from "@shared/communication-locale";
import { messageNoticeCopy } from "@shared/message-notice-copy";

export const MESSAGE_EMAIL_COOLDOWN_MS = 15 * 60 * 1000;
export type MessageNotice = { recipientId: string; sourceId: number } & (
  { kind: "chat"; senderId: string } | { kind: "admin" }
);
export type NoticeState = {
  authorized: boolean; unread: boolean; banned: boolean;
  email: string | null; emailVerified: boolean; preferences: string | null;
};
export function emailNoticeEligible(state: NoticeState, now: Date) {
  const prefs = parseNotificationPreferences(state.preferences) as ReturnType<typeof parseNotificationPreferences> & { messageEmailNoticeAt?: unknown };
  if (!state.authorized || !state.unread || state.banned || !prefs.messages ||
      !prefs.messageEmails || !state.email || !state.emailVerified) return false;
  if (prefs.messageEmailNoticeAt !== undefined) {
    const previous = typeof prefs.messageEmailNoticeAt === "string" ? Date.parse(prefs.messageEmailNoticeAt) : NaN;
    if (!Number.isFinite(previous)) throw new Error("Invalid email notification cooldown");
    if (now.getTime() - previous < MESSAGE_EMAIL_COOLDOWN_MS) return false;
  }
  return true;
}
type Dependencies = {
  read(input: MessageNotice): Promise<NoticeState | null>;
  // Must recheck current consent, message read status and access under a recipient row lock.
  claim(input: MessageNotice, now: Date): Promise<NoticeState | null>;
  push(userId: string, payload: { title: string; body: string; url: string }): Promise<unknown>;
  email(address: string, title: string, body: string, path: string): Promise<void>;
  emailReady(): boolean;
  production: boolean;
  now(): Date;
  wait(): Promise<void>;
};
export function createMessageNotifier(deps: Dependencies) {
  return async (input: MessageNotice) => {
    try {
      const state = await deps.read(input);
      if (!state || !state.authorized || !state.unread || state.banned) return;
      const prefs = parseNotificationPreferences(state.preferences);
      if (!prefs.messages) return;
      const copy = messageNoticeCopy[recipientLocale(state.preferences)];
      const path = input.kind === "chat" ? "/matches" : "/";
      try { await deps.push(input.recipientId, { title: copy.title, body: copy.body, url: path }); }
      catch { console.error("[Message notices] Push delivery failed"); }
      if (!deps.production || !deps.emailReady() || !emailNoticeEligible(state, deps.now())) return;
      // Give the open conversation a chance to mark the new message as read.
      await deps.wait();
      const claimed = await deps.claim(input, deps.now());
      if (!claimed?.email) return;
      const emailCopy = messageNoticeCopy[recipientLocale(claimed.preferences)];
      await deps.email(claimed.email, emailCopy.title, `${emailCopy.emailBody}\n\n${emailCopy.footer}`, path);
    } catch {
      // Never lose the saved message or expose provider errors, addresses or private chat content.
      console.error("[Message notices] Notification delivery failed");
    }
  };
}
