import webpush from 'web-push';
import { db } from './db';
import { pushSubscriptions, users } from '@shared/schema';
import { eq, ne } from 'drizzle-orm';
import { recipientLocale } from "@shared/communication-locale";
import { localizeAutomaticNotice } from "@shared/communication-notices";
import { sendNativePush } from "./nativePush";
import { nativePushConfiguration, type NativeNotice } from "./nativePushTransport";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:fallonyouclient@hotmail.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export async function saveSubscription(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const existing = await db.select().from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
  
  if (existing.length > 0) {
    await db.update(pushSubscriptions)
      .set({ userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth })
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
  } else {
    await db.insert(pushSubscriptions).values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });
  }
}

export async function removeSubscription(endpoint: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function sendPushNotification(userId: string, payload: {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  actions?: Array<{ action: string; title: string }>;
  preference?: NativeNotice["preference"];
}) {
  const nativeResults = await sendNativePush(userId, payload);
  const subs = await db.select({
    endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth,
    prefs: users.notificationPrefs, banned: users.isBanned,
  }).from(pushSubscriptions).innerJoin(users, eq(users.id, pushSubscriptions.userId))
    .where(eq(pushSubscriptions.userId, userId));
  if (!subs.length) return nativeResults;
  const recipient = subs[0];
  if (recipient.banned === "true") return [];
  let locale;
  try { locale = recipientLocale(recipient.prefs); }
  catch {
    console.error("[Push] Unreadable communication preferences; notification skipped");
    return [{ status: "rejected" as const, reason: new Error("Unreadable communication preferences") }];
  }
  payload = localizeAutomaticNotice(payload, locale);

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/favicon.png',
            url: payload.url || '/',
            actions: payload.actions || [],
          })
        );
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await removeSubscription(sub.endpoint);
        }
        throw error;
      }
    })
  );

  return [...nativeResults, ...results];
}

export async function sendPushToAllExcept(excludeUserId: string, payload: {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  preference?: NativeNotice["preference"];
}) {
  const nativeResults = await sendNativePush(excludeUserId, payload, true);
  const subs = await db.select({
    endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth,
    prefs: users.notificationPrefs, banned: users.isBanned,
  }).from(pushSubscriptions).innerJoin(users, eq(users.id, pushSubscriptions.userId))
    .where(ne(pushSubscriptions.userId, excludeUserId));

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      if (sub.banned === "true") return;
      const localized = localizeAutomaticNotice(payload, recipientLocale(sub.prefs));
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: localized.title,
            body: localized.body,
            icon: payload.icon || '/favicon.png',
            url: payload.url || '/',
          })
        );
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await removeSubscription(sub.endpoint);
        }
        throw error;
      }
    })
  );

  return [...nativeResults, ...results];
}

export function getVapidPublicKey() {
  return vapidPublicKey;
}

export function isPushDeliveryConfigured() {
  const native = nativePushConfiguration();
  return !!(vapidPublicKey && vapidPrivateKey) || native.ios || native.android;
}
