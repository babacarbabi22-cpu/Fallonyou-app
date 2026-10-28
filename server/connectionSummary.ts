import type { RequestHandler } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { connectionSummarySchema, type ConnectionSummary } from "@shared/connection-summary";

export async function getConnectionSummary(viewerId: string, database = db): Promise<ConnectionSummary> {
  const result = await database.execute(sql`
    WITH connected_members AS (
      SELECT DISTINCT u.id,
        NULLIF(left(trim(p.current_city), 160), '') AS city,
        NULLIF(left(trim(p.birthplace), 160), '') AS origin
      FROM matches m
      JOIN users u ON u.id = CASE WHEN m.user1_id = ${viewerId} THEN m.user2_id ELSE m.user1_id END
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE m.status = 'matched'
        AND (m.user1_id = ${viewerId} OR m.user2_id = ${viewerId})
        AND u.id <> ${viewerId} AND u.is_banned = 'false'
        AND NOT EXISTS (
          SELECT 1 FROM blocked_users b WHERE
            (b.user_id = ${viewerId} AND b.blocked_user_id = u.id) OR
            (b.blocked_user_id = ${viewerId} AND b.user_id = u.id)
        )
    ), cities AS (
      SELECT min(city) AS label FROM connected_members WHERE city IS NOT NULL GROUP BY lower(city)
    ), origins AS (
      SELECT min(origin) AS label FROM connected_members WHERE origin IS NOT NULL GROUP BY lower(origin)
    )
    SELECT json_build_object(
      'totalConnections', (SELECT count(*)::int FROM connected_members),
      'cities', COALESCE((SELECT json_agg(label ORDER BY label) FROM (SELECT label FROM cities ORDER BY label LIMIT 8) c), '[]'::json),
      'origins', COALESCE((SELECT json_agg(label ORDER BY label) FROM (SELECT label FROM origins ORDER BY label LIMIT 8) o), '[]'::json),
      'hasMoreCities', (SELECT count(*) > 8 FROM cities),
      'hasMoreOrigins', (SELECT count(*) > 8 FROM origins)
    ) AS summary
  `);
  return connectionSummarySchema.parse(result.rows[0]?.summary);
}

export function createConnectionSummaryHandler(read: (viewerId: string) => Promise<ConnectionSummary>): RequestHandler {
  return async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.vary("Cookie");
    if (!req.isAuthenticated?.() || !req.user?.id) return void res.sendStatus(401);
    try {
      // The viewer comes from the server session, never a URL/body parameter.
      res.json(connectionSummarySchema.parse(await read(req.user.id)));
    } catch {
      console.error("Unable to load private connection summary");
      res.status(500).json({ error: "Unable to load connections" });
    }
  };
}
