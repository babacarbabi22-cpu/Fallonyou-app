import webpush from 'web-push';
import { db } from './db';
import { pushSubscriptions } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
}) {
  const subs = await db.select().from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

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

  return results;
}

export function getVapidPublicKey() {
  return vapidPublicKey;
}
