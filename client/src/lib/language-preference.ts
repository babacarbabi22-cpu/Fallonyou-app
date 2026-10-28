export type Language = "es" | "en" | "fr" | "sv";

export const LANGUAGE_STORAGE_KEY = "fallonyou_language";
export const DEFAULT_LANGUAGE: Language = "en";

// Only an explicit saved choice overrides English, not the device's locale.
export function resolveInitialLanguage(saved: string | null): Language {
  return saved === "es" || saved === "en" || saved === "fr" || saved === "sv"
    ? saved
    : DEFAULT_LANGUAGE;
}