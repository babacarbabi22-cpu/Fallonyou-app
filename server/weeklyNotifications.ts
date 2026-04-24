import cron from 'node-cron';
import { db } from './db';
import { users, profiles, photos, events as eventsTable, eventParticipants, pushSubscriptions } from '@shared/schema';
import { eq, sql, and, gte, lte, isNull, lt } from 'drizzle-orm';
import { sendPushNotification } from './pushService';
import { sendPhotoReminderEmail, sendIncompleteOnboardingEmail } from './emailService';

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

const incompleteProfileMessages = [
  {
    title: "📸 ¡Añade más fotos y conéctate!",
    body: "Con 3 fotos o más tu perfil queda verificado y aparece antes. ¡Solo te faltan un par!",
    url: "/profile",
  },
  {
    title: "🌟 Tu perfil casi está listo",
    body: "Sube más fotos, escribe tu bio y empieza a recibir conexiones. ¡Tardas 2 minutos!",
    url: "/profile",
  },
  {
    title: "✅ Completa tu verificación",
    body: "Los perfiles verificados generan el doble de conexiones. ¡Solo faltan tus fotos!",
    url: "/profile",
  },
  {
    title: "👋 ¡Alguien podría estar esperándote!",
    body: "Completa tu perfil con más fotos para que puedan encontrarte. ¡Es fácil y rápido!",
    url: "/profile",
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

async function getPhotoCount(userId: string): Promise<number> {
  const userPhotos = await db.select({ id: photos.id })
    .from(photos).where(eq(photos.userId, userId));
  return userPhotos.length;
}

async function hasBio(userId: string): Promise<boolean> {
  const profile = await db.select({ bio: profiles.bio })
    .from(profiles).where(eq(profiles.userId, userId));
  return !!(profile[0]?.bio && profile[0].bio.trim().length > 0);
}

export async function sendIncompleteProfileNotifications() {
  console.log('[Profile Notifications] Checking for users with incomplete profiles...');

  const userIds = await getUsersWithSubscriptions();
  let sent = 0;
  let skipped = 0;

  for (const userId of userIds) {
    try {
      const photoCount = await getPhotoCount(userId);
      const bio = await hasBio(userId);

      // Only send if profile is incomplete (fewer than 3 photos or no bio)
      if (photoCount < 3 || !bio) {
        const msg = incompleteProfileMessages[Math.floor(Math.random() * incompleteProfileMessages.length)];
        await sendPushNotification(userId, {
          title: msg.title,
          body: msg.body,
          url: msg.url,
          icon: '/favicon.png',
        });
        sent++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`[Profile Notifications] Error sending to user ${userId}:`, err);
    }
  }

  console.log(`[Profile Notifications] Done. Sent: ${sent}, Skipped (complete): ${skipped}`);
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

export async function sendPhotoReminderEmails(): Promise<{ sent: number; failed: number }> {
  console.log('[Photo Email] Starting photo reminder email campaign...');

  // Get all users without a profileImageUrl who have an email
  const usersWithoutPhoto = await db.select({
    id: users.id,
    email: users.email,
    firstName: users.firstName,
  })
    .from(users)
    .where(isNull(users.profileImageUrl));

  const targets = usersWithoutPhoto.filter(u => u.email);
  console.log(`[Photo Email] Found ${targets.length} users without photo (with email)`);

  let sent = 0;
  let failed = 0;

  for (const user of targets) {
    const ok = await sendPhotoReminderEmail(user.email!, user.firstName || '');
    if (ok) sent++;
    else failed++;
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`[Photo Email] Done — sent: ${sent}, failed: ${failed}`);
  return { sent, failed };
}

export async function sendIncompleteOnboardingReminderEmails() {
  console.log('[Onboarding Reminder] Checking for users without photos registered 24-72h ago...');

  const now = new Date();
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const h72ago = new Date(now.getTime() - 72 * 60 * 60 * 1000);

  // Users registered between 24h and 72h ago, with no profile photo
  const targets = await db
    .select({ id: users.id, email: users.email, firstName: users.firstName })
    .from(users)
    .where(
      and(
        isNull(users.profileImageUrl),
        lt(users.createdAt, h24ago),
        gte(users.createdAt, h72ago),
      )
    );

  console.log(`[Onboarding Reminder] Found ${targets.length} users to remind`);

  let sent = 0;
  let failed = 0;
  for (const user of targets) {
    if (!user.email) { failed++; continue; }
    const ok = await sendIncompleteOnboardingEmail(user.email, user.firstName || '');
    if (ok) sent++; else failed++;
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`[Onboarding Reminder] Done — sent: ${sent}, failed: ${failed}`);
  return { sent, failed };
}

export function startWeeklyNotificationScheduler() {
  // Every Monday at 10:00 AM — push notifications
  cron.schedule('0 10 * * 1', async () => {
    await sendWeeklyNotifications();
  }, { timezone: 'Europe/Madrid' });

  // Every Wednesday at 11:00 AM — email to users without photo
  cron.schedule('0 11 * * 3', async () => {
    await sendPhotoReminderEmails();
  }, { timezone: 'Europe/Madrid' });

  // Every day at 10:00 AM — check for events starting in ~24h
  cron.schedule('0 10 * * *', async () => {
    await sendEventReminders();
  }, { timezone: 'Europe/Madrid' });

  // Tuesdays and Thursdays at 9:00 AM — encourage incomplete profiles
  cron.schedule('0 9 * * 2,4', async () => {
    await sendIncompleteProfileNotifications();
  }, { timezone: 'Europe/Madrid' });

  // Every day at 12:00 PM — email users who registered 24-72h ago without completing profile
  cron.schedule('0 12 * * *', async () => {
    await sendIncompleteOnboardingReminderEmails();
  }, { timezone: 'Europe/Madrid' });

  console.log('[Weekly Notifications] Scheduler started — weekly Mondays + daily 24h reminders + Tue/Thu profile nudges + 24h onboarding reminders (Europe/Madrid)');
}
