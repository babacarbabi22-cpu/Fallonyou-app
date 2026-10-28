import type { RequestHandler } from "express";

type Dependencies = {
  getAccount(id: string): Promise<{ stripeSubscriptionId: string | null; stripeCustomerId: string | null } | undefined>;
  cancelSubscription(subscriptionId: string, customerId: string): Promise<unknown>;
  deleteAccount(id: string): Promise<{ queuedMedia: number }>;
};

export function createAccountDeletionHandler(deps: Dependencies): RequestHandler {
  return async (req, res) => {
    if (!req.isAuthenticated?.() || !req.user?.id) return res.sendStatus(401);
    const userId = req.user.id;
    let result: { queuedMedia: number };
    try {
      const account = await deps.getAccount(userId);
      if (!account) return res.sendStatus(404);
      // Subscription errors must leave the account intact.
      if (account.stripeSubscriptionId) {
        if (!account.stripeCustomerId) {
          return res.status(409).json({ error: "Subscription ownership must be resolved before account deletion" });
        }
        await deps.cancelSubscription(account.stripeSubscriptionId, account.stripeCustomerId);
      }
      // This transaction also revokes all sessions belonging to the account.
      result = await deps.deleteAccount(userId);
    } catch {
      console.error("[Account deletion] Could not delete account");
      return res.status(500).json({ error: "Failed to delete account" });
    }

    // Deletion is committed. Session housekeeping must not turn that success
    // into a false "could not delete" response. This app does not use Passport.
    Reflect.deleteProperty(req, "user");
    req.isAuthenticated = (() => false) as typeof req.isAuthenticated;
    res.setHeader("Cache-Control", "no-store");
    res.clearCookie("connect.sid", { path: "/" });
    const respond = () => res.json({
      success: true,
      mediaCleanup: result.queuedMedia ? "queued" : "not_required",
    });
    if (!req.session) return respond();
    delete (req.session as any).userId;
    delete (req.session as any).user;
    try {
      req.session.destroy(error => {
        if (error) console.error("[Account deletion] Session cleanup failed after committed deletion");
        respond();
      });
    } catch {
      console.error("[Account deletion] Session cleanup failed after committed deletion");
      return respond();
    }
  };
}
