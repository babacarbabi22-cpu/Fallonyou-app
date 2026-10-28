import type { RequestHandler } from "express";
import type { Match } from "@shared/schema";
import { sortConnectionsNewestFirst } from "@shared/connection-time";

type Member = {
  id: string; firstName: string | null; lastName: string | null;
  profileImageUrl: string | null; isVerified: string | null; isBanned?: string | null;
};
type Dependencies = {
  requests(userId: string, direction: "sent" | "incoming"): Promise<Match[]>;
  blockedIds(userId: string): Promise<Set<string>>;
  members(ids: string[]): Promise<Member[]>;
};

export function createConnectionRequestsHandler(direction: "sent" | "incoming", deps: Dependencies): RequestHandler {
  return async (req, res) => {
    if (!req.isAuthenticated?.() || !req.user?.id) return res.sendStatus(401);
    res.setHeader("Cache-Control", "private, no-store");
    res.vary("Cookie");
    try {
      const owner = req.user.id;
      const [requests, blocked] = await Promise.all([deps.requests(owner, direction), deps.blockedIds(owner)]);
      const otherId = (row: Match) => direction === "incoming" ? row.user1Id : row.user2Id;
      const visible = sortConnectionsNewestFirst(requests.filter(row =>
        row.status === "pending" && (direction === "incoming" ? row.user2Id : row.user1Id) === owner &&
        otherId(row) !== owner && !blocked.has(otherId(row)),
      ));
      if (!visible.length) return res.json([]);
      const members = await deps.members([...new Set(visible.map(otherId))]);
      const memberMap = new Map(members.filter(member => member.isBanned !== "true").map(member => [member.id, member]));
      return res.json(visible.flatMap(row => {
        const member = memberMap.get(otherId(row));
        if (!member) return [];
        // No emails, billing state, moderation fields or profile-private data.
        const { id, firstName, lastName, profileImageUrl, isVerified } = member;
        return [{ id: row.id, user1Id: row.user1Id, user2Id: row.user2Id,
          status: row.status, createdAt: row.createdAt,
          otherUser: { id, firstName, lastName, profileImageUrl, isVerified } }];
      }));
    } catch {
      console.error("[Connections] Could not load requests");
      return res.status(500).json({ error: "Could not load connection requests" });
    }
  };
}
