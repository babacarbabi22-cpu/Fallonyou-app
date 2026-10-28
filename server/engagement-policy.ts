import { z } from "zod";
import { engagementCopy, engagementLocale } from "@shared/engagement-copy";
import { parseNotificationPreferences } from "@shared/notification-preferences";

export const studyActivitySchema = z.object({
  language: z.enum(["en", "es", "fr", "it", "pt", "de", "ja", "zh", "ar", "nl", "sv"]),
  locale: z.enum(["en", "es", "fr", "sv"]),
  lessonId: z.string().trim().min(1).max(80).optional(),
}).strict();
export const solidarityInterestSchema = z.object({
  country: z.string().trim().min(2).max(100),
  support: z.string().trim().min(10).max(1000),
}).strict();
export type StudyActivity = z.infer<typeof studyActivitySchema> & {
  lastStartedAt: string;
  lastReminderAt?: string;
};

export function reminderDue(preferences: string | null, now: Date, completedAt?: Date | null): StudyActivity | null {
  const prefs = parseNotificationPreferences(preferences) as ReturnType<typeof parseNotificationPreferences> & { studyActivity?: StudyActivity };
  const study = prefs.studyActivity;
  if (!prefs.learningReminders || !study || !studyActivitySchema.safeParse({
    language: study.language, locale: study.locale, ...(study.lessonId ? { lessonId: study.lessonId } : {}),
  }).success) return null;
  const started = new Date(study.lastStartedAt).getTime();
  const elapsed = now.getTime() - started;
  const day = 24 * 60 * 60 * 1000;
  if (!Number.isFinite(started) || elapsed < day || elapsed > 7 * day) return null;
  if (study.lastReminderAt) {
    const last = new Date(study.lastReminderAt).getTime();
    if (!Number.isFinite(last) || now.getTime() - last < day) return null;
  }
  if (completedAt && now.getTime() - completedAt.getTime() < day) return null;
  return study;
}

export function connectionNotice(preferences: string | null, senderName: string, confirmed: boolean) {
  const prefs = parseNotificationPreferences(preferences);
  if (!prefs.matches) return null;
  const copy = engagementCopy[engagementLocale((prefs as Record<string, unknown>).interfaceLanguage)];
  return {
    type: confirmed ? "match" : "connection_request",
    title: confirmed ? copy.matchTitle : copy.requestTitle,
    body: confirmed ? copy.matchBody : copy.requestBody.replace("{name}", senderName || "FallonYou"),
    link: "/matches",
  };
}