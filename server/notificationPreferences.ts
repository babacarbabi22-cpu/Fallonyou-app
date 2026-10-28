import type { RequestHandler } from "express";
import { z } from "zod";
import { parseNotificationPreferences } from "@shared/notification-preferences";

type Repository = {
  read(userId: string): Promise<{ notificationPrefs: string | null; email?: string | null; emailVerified?: string | null } | undefined>;
  write(userId: string, preferences: string): Promise<void>;
  merge?(userId: string, patch: Record<string, unknown>): Promise<Record<string, unknown> | undefined>;
};

const patchSchema = z.object({
  profileViews: z.boolean().optional(),
  newTravelers: z.boolean().optional(),
  matches: z.boolean().optional(),
  messages: z.boolean().optional(),
  messageEmails: z.boolean().optional(),
  events: z.boolean().optional(),
  learningReminders: z.boolean().optional(),
  interfaceLanguage: z.enum(["en", "es", "fr", "sv"]).optional(),
}).strict().refine(value => Object.keys(value).length > 0);

export function createNotificationPreferencesHandlers(repository: Repository) {
  const read: RequestHandler = async (req, res) => {
    if (!req.isAuthenticated?.() || !req.user?.id) {
      res.sendStatus(401);
      return;
    }
    try {
      const user = await repository.read(req.user.id);
      if (!user) { res.sendStatus(404); return; }
      res.json(parseNotificationPreferences(user.notificationPrefs));
    } catch {
      console.error("[Notification preferences] Read failed");
      res.status(500).json({ error: "Unable to load notification preferences" });
    }
  };

  const update: RequestHandler = async (req, res) => {
    if (!req.isAuthenticated?.() || !req.user?.id) {
      res.sendStatus(401);
      return;
    }
    const patch = patchSchema.safeParse(req.body);
    if (!patch.success) {
      res.status(400).json({ error: "Invalid notification preferences" });
      return;
    }
    try {
      if (patch.data.messageEmails === true) {
        const recipient = await repository.read(req.user.id);
        if (!recipient) { res.sendStatus(404); return; }
        if (!recipient.email || recipient.emailVerified !== "true") {
          res.status(409).json({ error: "Verify your email before enabling message emails" });
          return;
        }
      }
      if (repository.merge) {
        const merged = await repository.merge(req.user.id, patch.data);
        if (!merged) { res.sendStatus(404); return; }
        res.json(merged);
        return;
      }
      const user = await repository.read(req.user.id);
      if (!user) { res.sendStatus(404); return; }
      const merged = { ...parseNotificationPreferences(user.notificationPrefs), ...patch.data };
      await repository.write(req.user.id, JSON.stringify(merged));
      res.json(merged);
    } catch {
      console.error("[Notification preferences] Update failed");
      res.status(500).json({ error: "Unable to save notification preferences" });
    }
  };

  return { read, update };
}