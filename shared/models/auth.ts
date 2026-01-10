import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  isPremium: varchar("is_premium").default("false"),
  premiumExpiresAt: timestamp("premium_expires_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  dailyLikesUsed: varchar("daily_likes_used").default("0"),
  lastLikeResetDate: timestamp("last_like_reset_date"),
  isVerified: varchar("is_verified").default("false"),
  verifiedAt: timestamp("verified_at"),
  location: varchar("location"),
  latitude: varchar("latitude"),
  longitude: varchar("longitude"),
  dailySuperLikesUsed: varchar("daily_super_likes_used").default("0"),
  lastSuperLikeResetDate: timestamp("last_super_like_reset_date"),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
