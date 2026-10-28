import type { RequestHandler } from "express";
import { requestCommunicationLocale, type CommunicationLocale } from "@shared/communication-locale";
import { storedManualRecoveryToken } from "./passwordRecovery";
import { isValidEmail } from "./security";

type Recipient = {
  id: string;
  email: string | null;
  firstName: string | null;
  isBanned: string | null;
  notificationPrefs?: string | null;
};

export type AdminRecoveryDependencies = {
  authorizeAdmin: (userId: string) => Promise<boolean>;
  deliveryReady: () => boolean;
  findUser: (userId: string) => Promise<Recipient | undefined>;
  issue: (userId: string, stored: string, expiry: Date) => Promise<boolean>;
  revoke: (userId: string, stored: string) => Promise<void>;
  deliver: (email: string, name: string, link: string, locale: CommunicationLocale) => Promise<boolean>;
  now: () => Date;
  token: () => string;
  baseUrl: () => string;
  report: (event: string) => void;
};

export function createAdminPasswordRecoveryHandler(deps: AdminRecoveryDependencies): RequestHandler {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!req.isAuthenticated()) return void res.status(401).json({ code: "AUTH_REQUIRED" });
    try {
      if (!await deps.authorizeAdmin(req.user!.id)) {
        return void res.status(403).json({ code: "ADMIN_REQUIRED" });
      }
      const userId = req.params.userId;
      if (typeof userId !== "string" || !userId.trim() || userId.length > 200) {
        return void res.status(400).json({ code: "INVALID_ACCOUNT" });
      }
      if (!deps.deliveryReady()) return void res.status(503).json({ code: "RECOVERY_UNAVAILABLE" });
      const recipient = await deps.findUser(userId);
      if (!recipient) return void res.status(404).json({ code: "ACCOUNT_NOT_FOUND" });
      if (recipient.isBanned === "true") return void res.status(403).json({ code: "ACCOUNT_SUSPENDED" });
      if (!recipient.email || !isValidEmail(recipient.email)) {
        return void res.status(400).json({ code: "ACCOUNT_HAS_NO_EMAIL" });
      }
      const token = deps.token();
      const stored = storedManualRecoveryToken(token);
      const expiry = new Date(deps.now().getTime() + 60 * 60 * 1000);
      if (!await deps.issue(recipient.id, stored, expiry)) {
        res.setHeader("Retry-After", "60");
        return void res.status(429).json({ code: "RECOVERY_RATE_LIMITED" });
      }
      // Never accept an arbitrary recipient or URL from the administrator's body.
      const link = new URL("/reset-password", deps.baseUrl());
      link.searchParams.set("token", token);
      let delivered = false;
      try {
        delivered = await deps.deliver(
          recipient.email, recipient.firstName || "", link.href,
          requestCommunicationLocale(undefined, recipient.notificationPrefs),
        );
      } catch { /* Do not log provider errors that may contain credentials or links. */ }
      if (!delivered) {
        deps.report("manual-email-delivery-failed");
        try { await deps.revoke(recipient.id, stored); }
        catch { deps.report("manual-token-revocation-failed"); }
        return void res.status(503).json({ code: "DELIVERY_FAILED" });
      }
      deps.report("manual-email-provider-accepted");
      // Provider acceptance is not proof of inbox delivery. Do not expose the link.
      res.json({ success: true, providerAccepted: true, expiresInSeconds: 3600 });
    } catch {
      deps.report("manual-request-failed");
      res.status(503).json({ code: "RECOVERY_UNAVAILABLE" });
    }
  };
}
