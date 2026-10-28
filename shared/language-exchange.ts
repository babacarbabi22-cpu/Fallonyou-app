import { z } from "zod";

export const exchangeLanguageCodes = ["en", "es", "fr", "it", "pt", "de", "ja", "zh", "ar", "nl", "sv"] as const;
export const exchangeLanguageSchema = z.enum(exchangeLanguageCodes);
export const helperPreferencesSchema = z.object({
  offeredLanguages: z.array(exchangeLanguageSchema).max(exchangeLanguageCodes.length),
}).strict().transform(({ offeredLanguages }) => ({ offeredLanguages: [...new Set(offeredLanguages)] }));
export const exchangeRequestSchema = z.object({
  toUserId: z.string().min(1).max(200),
  language: exchangeLanguageSchema,
}).strict();
export const exchangeActionSchema = z.object({
  action: z.enum(["accept", "decline", "cancel"]),
}).strict();
