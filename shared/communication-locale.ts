import { parseNotificationPreferences } from "./notification-preferences";

export type CommunicationLocale = "en" | "es" | "fr" | "sv";
export function isCommunicationLocale(value: unknown): value is CommunicationLocale {
  return value === "en" || value === "es" || value === "fr" || value === "sv";
}
export function communicationLocale(value: unknown): CommunicationLocale {
  return isCommunicationLocale(value) ? value : "en";
}
export function recipientLocale(preferences: string | null | undefined): CommunicationLocale {
  const parsed = parseNotificationPreferences(preferences) as unknown as Record<string, unknown>;
  return communicationLocale(parsed.interfaceLanguage);
}
export function requestCommunicationLocale(requested: unknown, preferences: string | null | undefined): CommunicationLocale {
  return isCommunicationLocale(requested) ? requested : recipientLocale(preferences);
}
