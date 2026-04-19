
import { pgTable, text, serial, integer, boolean, timestamp, varchar, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export * from "./models/auth";

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  bio: text("bio"),
  age: integer("age"),
  gender: text("gender"),
  preference: text("preference"),
  zodiacSign: text("zodiac_sign"),
  smoking: text("smoking"),
  drinking: text("drinking"),
  children: text("children"),
  education: text("education"),
  occupation: text("occupation"),
  birthplace: text("birthplace"),
  height: integer("height"),
  religion: text("religion"),
  politics: text("politics"),
  pets: text("pets"),
  exercise: text("exercise"),
  incognito: boolean("incognito").default(false),
  interests: text("interests").array(),
  relationshipType: text("relationship_type"),
  lastActive: timestamp("last_active").defaultNow(),
  // New travel/social features
  connectionTypes: text("connection_types").array().default([]),
  travelInterests: text("travel_interests").array().default([]),
  travelerMode: boolean("traveler_mode").default(false),
  currentCity: text("current_city"),
  homeCity: text("home_city"),
  travelerVerified: boolean("traveler_verified").default(false),
  latitude: real("latitude"),
  longitude: real("longitude"),
  lastLocationAt: timestamp("last_location_at"),
});

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  url: text("url").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  user1Id: varchar("user1_id").notNull().references(() => users.id),
  user2Id: varchar("user2_id").notNull().references(() => users.id),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  raterId: varchar("rater_id").notNull().references(() => users.id),
  score: integer("score").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages between matched users
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Profile prompts/questions
export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  category: text("category"),
});

export const promptResponses = pgTable("prompt_responses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  promptId: integer("prompt_id").notNull().references(() => prompts.id),
  answer: text("answer").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Super likes tracking
export const superLikes = pgTable("super_likes", {
  id: serial("id").primaryKey(),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// User preferences for discovery
export const preferences = pgTable("preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  minAge: integer("min_age").default(18),
  maxAge: integer("max_age").default(50),
  maxDistance: integer("max_distance").default(50),
  showMe: text("show_me").default("everyone"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Blocked users
export const blockedUsers = pgTable("blocked_users", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  blockedUserId: varchar("blocked_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reports
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  reportedUserId: varchar("reported_user_id").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Events/Activities
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  city: text("city").notNull(),
  location: text("location"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at"),
  capacity: integer("capacity"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Event participants
export const eventParticipants = pgTable("event_participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("going"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventComments = pgTable("event_comments", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type EventComment = typeof eventComments.$inferSelect;

export const eventRatings = pgTable("event_ratings", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  createdAt: timestamp("created_at").defaultNow(),
});

export type EventRating = typeof eventRatings.$inferSelect;
export const insertEventRatingSchema = createInsertSchema(eventRatings).omit({ id: true, createdAt: true });

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  photos: many(photos),
  matchesAsUser1: many(matches, { relationName: "user1" }),
  matchesAsUser2: many(matches, { relationName: "user2" }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  user: one(users, {
    fields: [photos.userId],
    references: [users.id],
  }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  user1: one(users, {
    fields: [matches.user1Id],
    references: [users.id],
    relationName: "user1",
  }),
  user2: one(users, {
    fields: [matches.user2Id],
    references: [users.id],
    relationName: "user2",
  }),
  ratings: many(ratings),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  match: one(matches, {
    fields: [ratings.matchId],
    references: [matches.id],
  }),
  rater: one(users, {
    fields: [ratings.raterId],
    references: [users.id],
  }),
}));

export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true });
export const insertPhotoSchema = createInsertSchema(photos).omit({ id: true, createdAt: true });
export const insertMatchSchema = createInsertSchema(matches).omit({ id: true, createdAt: true });
export const insertRatingSchema = createInsertSchema(ratings).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, readAt: true });
export const insertPromptResponseSchema = createInsertSchema(promptResponses).omit({ id: true, createdAt: true });
export const insertSuperLikeSchema = createInsertSchema(superLikes).omit({ id: true, createdAt: true });
export const insertPreferencesSchema = createInsertSchema(preferences).omit({ id: true, createdAt: true });
export const insertBlockedUserSchema = createInsertSchema(blockedUsers).omit({ id: true, createdAt: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true, status: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
export const insertEventParticipantSchema = createInsertSchema(eventParticipants).omit({ id: true, createdAt: true });

// Events relations
export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, {
    fields: [events.creatorId],
    references: [users.id],
  }),
  participants: many(eventParticipants),
}));

export const eventParticipantsRelations = relations(eventParticipants, ({ one }) => ({
  event: one(events, {
    fields: [eventParticipants.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventParticipants.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Photo = typeof photos.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Prompt = typeof prompts.$inferSelect;
export type PromptResponse = typeof promptResponses.$inferSelect;
export type InsertPromptResponse = z.infer<typeof insertPromptResponseSchema>;
export type SuperLike = typeof superLikes.$inferSelect;
export type Preferences = typeof preferences.$inferSelect;
export type InsertPreferences = z.infer<typeof insertPreferencesSchema>;
export type BlockedUser = typeof blockedUsers.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventParticipant = typeof eventParticipants.$inferSelect;
export type InsertEventParticipant = z.infer<typeof insertEventParticipantSchema>;

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  refereeId: varchar("referee_id").notNull().references(() => users.id).unique(),
  createdAt: timestamp("created_at").defaultNow(),
  rewardGranted: varchar("reward_granted").default("none"),
});

export type Referral = typeof referrals.$inferSelect;
