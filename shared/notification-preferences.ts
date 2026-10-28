export const DEFAULT_NOTIFICATION_PREFERENCES = {
  profileViews: true,
  newTravelers: true,
  matches: true,
  messages: true,
  messageEmails: false,
  events: true,
  learningReminders: false,
};

export type NotificationPreferences = typeof DEFAULT_NOTIFICATION_PREFERENCES;

export function parseNotificationPreferences(value: string | null | undefined): NotificationPreferences {
  const preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  if (!value) return preferences;
  const stored: unknown = JSON.parse(value);
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    throw new Error("Invalid stored notification preferences");
  }
  for (const key of Object.keys(preferences) as Array<keyof NotificationPreferences>) {
    const setting = (stored as Record<string, unknown>)[key];
    if (setting === undefined) continue;
    if (typeof setting !== "boolean") throw new Error("Invalid stored notification preference");
    preferences[key] = setting;
  }
  // Preserve existing extension fields when changing one known setting.
  return { ...stored, ...preferences };
}