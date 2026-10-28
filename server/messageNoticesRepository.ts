import { and, eq, or } from "drizzle-orm";
import { db } from "./db";
import { users, messages, matches, blockedUsers, notifications } from "@shared/schema";
import { parseNotificationPreferences } from "@shared/notification-preferences";
import { sendPushNotification } from "./pushService";
import { sendEngagementEmail, isConfigured } from "./emailService";
import { createMessageNotifier, emailNoticeEligible, type MessageNotice, type NoticeState } from "./messageNotices";

type Connection = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
async function readState(connection: Connection, input: MessageNotice, lock = false): Promise<NoticeState | null> {
  const query = connection.select({
    email: users.email, emailVerified: users.emailVerified,
    banned: users.isBanned, preferences: users.notificationPrefs,
  }).from(users).where(eq(users.id, input.recipientId));
  const [user] = lock ? await query.for("update") : await query;
  if (!user) return null;
  let authorized = false, unread = false;
  if (input.kind === "admin") {
    const [notice] = await connection.select({ read: notifications.read }).from(notifications)
      .where(and(eq(notifications.id, input.sourceId), eq(notifications.userId, input.recipientId), eq(notifications.type, "admin_message")));
    authorized = !!notice; unread = !!notice && !notice.read;
  } else {
    const [message] = await connection.select({
      readAt: messages.readAt, senderId: messages.senderId,
      user1Id: matches.user1Id, user2Id: matches.user2Id, status: matches.status,
    }).from(messages).innerJoin(matches, eq(matches.id, messages.matchId)).where(eq(messages.id, input.sourceId));
    authorized = !!message && message.senderId === input.senderId && message.status === "matched" &&
      ((message.user1Id === input.senderId && message.user2Id === input.recipientId) ||
       (message.user2Id === input.senderId && message.user1Id === input.recipientId));
    unread = !!message && !message.readAt;
    if (authorized) {
      const [blocked] = await connection.select({ id: blockedUsers.id }).from(blockedUsers).where(or(
        and(eq(blockedUsers.userId, input.senderId), eq(blockedUsers.blockedUserId, input.recipientId)),
        and(eq(blockedUsers.userId, input.recipientId), eq(blockedUsers.blockedUserId, input.senderId)),
      )).limit(1);
      authorized = !blocked;
    }
  }
  return { authorized, unread, banned: user.banned === "true", email: user.email,
    emailVerified: user.emailVerified === "true", preferences: user.preferences };
}
export const notifyMessageRecipient = createMessageNotifier({
  read: input => readState(db, input),
  claim: (input, now) => db.transaction(async tx => {
    const state = await readState(tx, input, true);
    if (!state || !emailNoticeEligible(state, now)) return null;
    const prefs = parseNotificationPreferences(state.preferences);
    await tx.update(users).set({ notificationPrefs: JSON.stringify({
      ...prefs, messageEmailNoticeAt: now.toISOString(),
    }) }).where(eq(users.id, input.recipientId));
    return state;
  }),
  push: sendPushNotification,
  email: sendEngagementEmail,
  emailReady: isConfigured,
  production: process.env.NODE_ENV === "production",
  now: () => new Date(),
  wait: () => new Promise(resolve => setTimeout(resolve, 1000)),
});
