import { z } from "zod";

export const connectionSummarySchema = z.object({
  totalConnections: z.number().int().nonnegative(),
  cities: z.array(z.string().min(1).max(160)).max(8),
  origins: z.array(z.string().min(1).max(160)).max(8),
  hasMoreCities: z.boolean(),
  hasMoreOrigins: z.boolean(),
});

export type ConnectionSummary = z.infer<typeof connectionSummarySchema>;
