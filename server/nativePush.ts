import type { Express } from "express";
import { and, eq, ne } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { db } from "./db";
import { nativePushDevices, users } from "@shared/schema";
import { nativePushDeviceInput, notificationPath } from "@shared/native-push";
import { parseNotificationPreferences } from "@shared/notification-preferences";
import { recipientLocale } from "@shared/communication-locale";
import { localizeAutomaticNotice } from "@shared/communication-notices";
import { nativePushConfiguration, sendNativeDevice, type NativeNotice, type ProviderResult } from "./nativePushTransport";

type Database = Pick<typeof db, "select" | "insert" | "delete">;
export function registerNativePushRoutes(app: Express, database: Database = db,
  configuration = nativePushConfiguration) {
  app.get("/api/push/native/config", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(configuration());
  });
  const limit = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false,
    keyGenerator: req => req.user!.id });
  app.use("/api/push/native", (req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (!req.isAuthenticated?.() || !req.user?.id) return res.sendStatus(401);
    next();
  }, limit);
  const handle = (remove: boolean) => async (req: any, res: any) => {
    const parsed = nativePushDeviceInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_input" });
    const { platform, token } = parsed.data;
    try {
      if (remove) {
        await database.delete(nativePushDevices).where(and(
          eq(nativePushDevices.userId, req.user.id), eq(nativePushDevices.platform, platform),
          eq(nativePushDevices.token, token)));
      } else {
        const [account] = await database.select({ banned: users.isBanned }).from(users).where(eq(users.id, req.user.id));
        if (!account || account.banned === "true") return res.sendStatus(403);
        if (!configuration()[platform]) return res.status(503).json({ error: "native_push_not_configured" });
        await database.insert(nativePushDevices).values({ userId: req.user.id, platform, token })
          .onConflictDoUpdate({ target: [nativePushDevices.platform, nativePushDevices.token],
            set: { userId: req.user.id, updatedAt: new Date() } });
      }
      res.json({ success: true });
    } catch {
      console.error("[Native push] Device update failed");
      res.status(503).json({ error: "unavailable" });
    }
  };
  app.post("/api/push/native/register", handle(false));
  app.post("/api/push/native/unregister", handle(true));
}

type Target = { id: number; userId: string; platform: string; token: string; prefs: string | null; banned: string | null };
export function nativeNoticeAllowed(prefs: string | null, notice: NativeNotice) {
  const preferences = parseNotificationPreferences(prefs);
  const path = notificationPath(notice.url).split("?")[0];
  if (path.startsWith("/matches")) return preferences.matches;
  if (path.startsWith("/chat") || path.startsWith("/messages")) return preferences.messages;
  if (path.startsWith("/events")) return preferences.events;
  if (path.startsWith("/languages")) return preferences.learningReminders;
  if (notice.preference) return preferences[notice.preference];
  return preferences.profileViews || preferences.newTravelers || preferences.matches ||
    preferences.messages || preferences.events || preferences.learningReminders;
}
export async function dispatchNativeTargets(targets: Target[], notice: NativeNotice,
  send: (platform: string, token: string, notice: NativeNotice) => Promise<ProviderResult>,
  remove: (target: Target) => Promise<unknown>) {
  const results: PromiseSettledResult<void>[] = [];
  for (let i = 0; i < targets.length; i += 8) {
    results.push(...await Promise.allSettled(targets.slice(i, i + 8).map(async target => {
      if (target.banned === "true" || !nativeNoticeAllowed(target.prefs, notice)) return;
      const locale = recipientLocale(target.prefs);
      let localized = localizeAutomaticNotice(notice, locale);
      const path = notificationPath(notice.url);
      if (notice.preference === "messages" || path.startsWith("/chat") || path.startsWith("/messages")) {
        const privateCopy = {
          en: { title: "New message", body: "You have an unread message. Open FallOnYou to read it." },
          es: { title: "Nuevo mensaje", body: "Tienes un mensaje sin leer. Abre FallOnYou para leerlo." },
          fr: { title: "Nouveau message", body: "Vous avez un message non lu. Ouvrez FallOnYou pour le lire." },
          sv: { title: "Nytt meddelande", body: "Du har ett oläst meddelande. Öppna FallOnYou för att läsa det." },
        };
        localized = { ...localized, ...privateCopy[locale] };
      }
      const result = await send(target.platform, target.token, localized);
      if (result.expired) await remove(target);
      if (!result.accepted) throw new Error("Native notification not accepted by provider");
    })));
  }
  return results;
}

export async function sendNativePush(userId: string, notice: NativeNotice, broadcast = false) {
  const configured = nativePushConfiguration();
  if (!configured.ios && !configured.android) return [];
  try {
    const targets = await db.select({
      id: nativePushDevices.id, userId: nativePushDevices.userId, platform: nativePushDevices.platform,
      token: nativePushDevices.token, prefs: users.notificationPrefs, banned: users.isBanned,
    }).from(nativePushDevices).innerJoin(users, eq(users.id, nativePushDevices.userId))
      .where(broadcast ? ne(users.id, userId) : eq(users.id, userId));
    const results = await dispatchNativeTargets(targets.filter(target =>
      (target.platform === "ios" && configured.ios) || (target.platform === "android" && configured.android)),
    notice, sendNativeDevice, target => db.delete(nativePushDevices).where(and(
      eq(nativePushDevices.id, target.id), eq(nativePushDevices.userId, target.userId), eq(nativePushDevices.token, target.token))));
    if (results.some(result => result.status === "rejected")) console.error("[Native push] Some deliveries failed");
    return results;
  } catch {
    console.error("[Native push] Delivery failed");
    return [{ status: "rejected" as const, reason: new Error("Native notification delivery failed") }];
  }
}
