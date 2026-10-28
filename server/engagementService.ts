import type { Express } from "express";
import cron from "node-cron";
import { and, eq, desc } from "drizzle-orm";
import { db } from "./db";
import { users, notifications, languageProgress } from "@shared/schema";
import { parseNotificationPreferences } from "@shared/notification-preferences";
import { engagementCopy, engagementLocale } from "@shared/engagement-copy";
import { connectionNotice, reminderDue, studyActivitySchema, solidarityInterestSchema } from "./engagement-policy";
import { sendPushNotification, isPushDeliveryConfigured } from "./pushService";
import type { NativeNotice } from "./nativePushTransport";
import { sendEngagementEmail } from "./emailService";

async function pushIfAvailable(userId: string, title: string, body: string, url: string, preference?: NativeNotice["preference"]) {
  if (!isPushDeliveryConfigured()) return;
  const result = await sendPushNotification(userId, { title, body, url, preference });
  if (result.some(item => item.status === "rejected")) console.error("[Engagement] Some push deliveries failed");
}

export async function notifyConnection(userId: string, senderName: string, confirmed: boolean) {
  const [recipient] = await db.select().from(users).where(eq(users.id, userId));
  if (!recipient || recipient.isBanned === "true") return;
  const notice = connectionNotice(recipient.notificationPrefs, senderName, confirmed);
  if (!notice) return;
  await db.insert(notifications).values({ userId, ...notice });
  await Promise.all([
    pushIfAvailable(userId, notice.title, notice.body, notice.link, "matches"),
    recipient.email && recipient.emailVerified === "true"
      ? sendEngagementEmail(recipient.email, notice.title, notice.body, notice.link) : Promise.resolve(),
  ]);
}

export function registerEngagementRoutes(app: Express) {
  app.post("/api/language/study/activity", async (req, res) => {
    if (!req.isAuthenticated?.() || !req.user?.id) return res.sendStatus(401);
    const input = studyActivitySchema.safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "Invalid study activity" });
    try {
      const found = await db.transaction(async tx => {
        const [user] = await tx.select().from(users).where(eq(users.id, req.user!.id)).for("update");
        if (!user || user.isBanned === "true") return false;
        const prefs = parseNotificationPreferences(user.notificationPrefs);
        const previous = (prefs as Record<string, any>).studyActivity;
        await tx.update(users).set({ notificationPrefs: JSON.stringify({
          ...prefs, interfaceLanguage: input.data.locale,
          studyActivity: { ...input.data, lastStartedAt: new Date().toISOString(), ...(previous?.lastReminderAt ? { lastReminderAt: previous.lastReminderAt } : {}) },
        }) }).where(eq(users.id, user.id));
        return true;
      });
      return found ? res.json({ ok: true }) : res.sendStatus(403);
    } catch {
      console.error("[Engagement] Failed to save study activity");
      return res.status(500).json({ error: "Unable to save study activity" });
    }
  });

  app.get("/api/solidarity-interest", async (req, res) => {
    if (!req.isAuthenticated?.() || !req.user?.id) return res.sendStatus(401);
    try {
      const [record] = await db.select().from(notifications).where(and(
        eq(notifications.userId, req.user.id), eq(notifications.type, "solidarity_interest_record"),
      )).orderBy(desc(notifications.createdAt)).limit(1);
      return res.json(record ? { submitted: true, ...JSON.parse(record.body!) } : { submitted: false });
    } catch {
      return res.status(500).json({ error: "Unable to load your idea" });
    }
  });

  app.post("/api/solidarity-interest", async (req, res) => {
    if (!req.isAuthenticated?.() || !req.user?.id) return res.sendStatus(401);
    const input = solidarityInterestSchema.safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "Country and support details required" });
    try {
      const status = await db.transaction(async tx => {
        const [user] = await tx.select().from(users).where(eq(users.id, req.user!.id)).for("update");
        if (!user || user.isBanned === "true") return 403;
        const [existing] = await tx.select().from(notifications).where(and(
          eq(notifications.userId, user.id), eq(notifications.type, "solidarity_interest_record"),
        )).limit(1);
        if (existing) return 200; // Idempotent retry; never send duplicate admin notices.
        const admins = await tx.select({ id: users.id }).from(users).where(and(eq(users.isAdmin, "true"), eq(users.isBanned, "false")));
        if (!admins.length) return 503;
        await tx.insert(notifications).values([
          { userId: user.id, type: "solidarity_interest_record", title: "Solidarity trip idea", body: JSON.stringify(input.data), read: true },
          ...admins.map(admin => ({
            userId: admin.id, type: "solidarity_interest", title: "New solidarity trip idea",
            body: `${user.firstName || "Traveler"}\n${input.data.country}\n${input.data.support}`,
            link: `/local-help?ideaFrom=${encodeURIComponent(user.id)}`,
          })),
        ]);
        return 200;
      });
      return res.status(status).json(status === 200 ? { ok: true } : { error: "Unable to receive your idea" });
    } catch {
      console.error("[Engagement] Failed to save solidarity idea");
      return res.status(500).json({ error: "Unable to receive your idea" });
    }
  });
}

export async function sendLearningReminders() {
  const candidates = await db.select({ id: users.id }).from(users).where(eq(users.isBanned, "false"));
  for (const candidate of candidates) {
    try {
      // Row lock + persisted lastReminderAt prevents repeat sends across processes.
      const notice = await db.transaction(async tx => {
        const [user] = await tx.select().from(users).where(eq(users.id, candidate.id)).for("update");
        if (!user || user.isBanned === "true") return null;
        const prefs = parseNotificationPreferences(user.notificationPrefs);
        const activity = (prefs as Record<string, any>).studyActivity;
        if (!prefs.learningReminders || !activity) return null;
        const [completed] = await tx.select({ at: languageProgress.completedAt }).from(languageProgress)
          .where(and(eq(languageProgress.userId, user.id), eq(languageProgress.language, activity.language)))
          .orderBy(desc(languageProgress.completedAt)).limit(1);
        const now = new Date();
        const study = reminderDue(user.notificationPrefs, now, completed?.at);
        if (!study) return null;
        const locale = engagementLocale(study.locale);
        const copy = engagementCopy[locale];
        const language = new Intl.DisplayNames([locale], { type: "language" }).of(study.language) || study.language;
        const body = copy.reminderBody.replace("{language}", language);
        const link = `/languages?lang=${encodeURIComponent(study.language)}`;
        await tx.insert(notifications).values({ userId: user.id, type: "language_reminder", title: copy.reminderTitle, body, link });
        await tx.update(users).set({ notificationPrefs: JSON.stringify({
          ...prefs, studyActivity: { ...study, lastReminderAt: now.toISOString() },
        }) }).where(eq(users.id, user.id));
        return { userId: user.id, email: user.emailVerified === "true" ? user.email : null, title: copy.reminderTitle, body, link };
      });
      if (notice) await Promise.all([
        pushIfAvailable(notice.userId, notice.title, notice.body, notice.link, "learningReminders"),
        notice.email ? sendEngagementEmail(notice.email, notice.title, notice.body, notice.link) : Promise.resolve(),
      ]);
    } catch {
      console.error("[Engagement] Learning reminder failed");
    }
  }
}

export function startLearningReminderScheduler() {
  // Never send real retention messages from local development or fixture tests.
  if (process.env.NODE_ENV !== "production") return;
  void sendLearningReminders();
  cron.schedule("0 * * * *", () => { void sendLearningReminders(); }, { timezone: "Europe/Madrid" });
}