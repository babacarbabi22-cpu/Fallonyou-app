import cron from 'node-cron';
import { db } from './db';
import { users, profiles, photos, events as eventsTable, eventParticipants, pushSubscriptions } from '@shared/schema';
import { eq, sql, and, gte, lte } from 'drizzle-orm';
import { sendPushNotification } from './pushService';

const weeklyMessages = [
  {
    title: "🌍 ¿Qué planes tienes esta semana?",
    body: "Descubre actividades cerca de ti o crea la tuya. ¡Alguien está esperando conocerte!",
    url: "/",
  },
  {
    title: "✈️ Viaja con compañía",
    body: "Únete a un evento o crea uno y deja que otros viajeros se apunten. FallonYou te espera.",
    url: "/",
  },
  {
    title: "🎉 ¡Nueva semana, nuevas conexiones!",
    body: "Hay actividades esperándote: cenas, deportes, excursiones... Entra y apúntate.",
    url: "/",
  },
  {
    title: "🤝 Conoce gente nueva hoy",
    body: "Cada actividad es una oportunidad. Crea un plan o únete a uno en FallonYou.",
    url: "/",
  },
];

const noPhotoMessages = [
  {
    title: "📸 Añade una foto de perfil",
    body: "Los perfiles con foto reciben muchas más conexiones. ¡Sube la tuya y destaca!",
    url: "/profile",
  },
  {
    title: "🌟 Tu perfil está incompleto",
    body: "Añade una foto y crea una actividad con imagen para atraer más participantes.",
    url: "/profile",
  },
];

const noEventMessages = [
  {
    title: "🎯 ¿Por qué no crear un plan?",
    body: "Organiza una cena, una excursión o un deporte. Añade una foto y ¡llena tu actividad!",
    url: "/",
  },
  {
    title: "💡 Ideas para esta semana",
    body: "Playa, montaña, restaurante... Crea tu actividad en FallonYou y conoce gente nueva.",
    url: "/",
  },
];

let weeklyMessageIndex = 0;

async function getUsersWithSubscriptions() {
  const subs = await db.select({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions);
  return [...new Set(subs.map(s => s.userId))];
}

async function hasProfilePhoto(userId: string): Promise<boolean> {
  const user = await db.select({ profileImageUrl: users.profileImageUrl })
    .from(users).where(eq(users.id, userId));
  if (user[0]?.profileImageUrl) return true;

  const userPhotos = await db.select().from(photos)
    .where(eq(photos.userId, userId));
  return userPhotos.length > 0;
}

async function hasCreatedEvent(userId: string): Promise<boolean> {
  const userEvents = await db.select({ id: eventsTable.id })
    .from(eventsTable)
    .where(eq(eventsTable.creatorId, userId));
  return userEvents.length > 0;
}

export async function sendWeeklyNotifications() {
  console.log('[Weekly Notifications] Starting weekly notification run...');

  const userIds = await getUsersWithSubscriptions();
  console.log(`[Weekly Notifications] Found ${userIds.length} users with push subscriptions`);

  const generalMsg = weeklyMessages[weeklyMessageIndex % weeklyMessages.length];
  weeklyMessageIndex++;

  let sent = 0;
  let errors = 0;

  for (const userId of userIds) {
    try {
      const hasPhoto = await hasProfilePhoto(userId);
      const hasEvent = await hasCreatedEvent(userId);

      if (!hasPhoto) {
        const msg = noPhotoMessages[Math.floor(Math.random() * noPhotoMessages.length)];
        await sendPushNotification(userId, {
          title: msg.title,
          body: msg.body,
          url: msg.url,
          icon: '/favicon.png',
        });
      } else if (!hasEvent) {
        const msg = noEventMessages[Math.floor(Math.random() * noEventMessages.length)];
        await sendPushNotification(userId, {
          title: msg.title,
          body: msg.body,
          url: msg.url,
          icon: '/favicon.png',
        });
      } else {
        await sendPushNotification(userId, {
          title: generalMsg.title,
          body: generalMsg.body,
          url: generalMsg.url,
          icon: '/favicon.png',
        });
      }
      sent++;
    } catch (err) {
      errors++;
      console.error(`[Weekly Notifications] Error sending to user ${userId}:`, err);
    }
  }

  console.log(`[Weekly Notifications] Done. Sent: ${sent}, Errors: ${errors}`);
}

export async function sendEventReminders() {
  console.log('[Event Reminders] Checking for events starting in ~24h...');

  const now = new Date();
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const upcomingEvents = await db.select().from(eventsTable)
    .where(and(gte(eventsTable.startsAt, in23h), lte(eventsTable.startsAt, in25h)));

  console.log(`[Event Reminders] Found ${upcomingEvents.length} events starting in ~24h`);

  for (const event of upcomingEvents) {
    const participants = await db.select().from(eventParticipants)
      .where(eq(eventParticipants.eventId, event.id));

    for (const participant of participants) {
      try {
        const startTime = event.startsAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        await sendPushNotification(participant.userId, {
          title: `⏰ Mañana tienes: ${event.title}`,
          body: `${event.city} · ${startTime} — ¡No lo olvides!`,
          url: `/event/${event.id}`,
          icon: '/favicon.png',
        });
      } catch (err) {
        console.error(`[Event Reminders] Error sending to user ${participant.userId}:`, err);
      }
    }
  }

  console.log('[Event Reminders] Done');
}

export function startWeeklyNotificationScheduler() {
  // Every Monday at 10:00 AM
  cron.schedule('0 10 * * 1', async () => {
    await sendWeeklyNotifications();
  }, { timezone: 'Europe/Madrid' });

  // Every day at 10:00 AM — check for events starting in ~24h
  cron.schedule('0 10 * * *', async () => {
    await sendEventReminders();
  }, { timezone: 'Europe/Madrid' });

  console.log('[Weekly Notifications] Scheduler started — weekly Mondays + daily 24h reminders at 10:00 AM (Europe/Madrid)');
}
