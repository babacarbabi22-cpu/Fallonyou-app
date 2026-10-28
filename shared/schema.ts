
import { pgTable, text, serial, integer, boolean, timestamp, varchar, real, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export * from "./models/auth";

export const placeReviews = pgTable("place_reviews", {
  id: serial("id").primaryKey(),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  placeKey: text("place_key").notNull(),
  kind: text("kind").notNull(),
  placeName: text("place_name").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  rating: integer("rating").notNull(),
  review: text("review").notNull(),
  recommendation: text("recommendation").notNull().default(""),
  hidden: boolean("hidden").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, table => [
  uniqueIndex("place_reviews_author_place").on(table.authorId, table.placeKey),
  index("place_reviews_place").on(table.placeKey),
  index("place_reviews_feed").on(table.hidden, table.id),
]);

export const placeReviewReports = pgTable("place_review_reports", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull().references(() => placeReviews.id, { onDelete: "cascade" }),
  reporterId: varchar("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  details: text("details").notNull().default(""),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, table => [
  uniqueIndex("place_reviews_one_report").on(table.reviewId, table.reporterId),
  index("place_review_reports_pending").on(table.resolved, table.id),
]);

// These records must survive user deletion; deliberately no FK to users.
export const uploadedMedia = pgTable("uploaded_media", {
  path: text("path").primaryKey(),
  ownerId: varchar("owner_id").notNull(),
  availableAt: timestamp("available_at").notNull().defaultNow(),
});

export const mediaDeletionJobs = pgTable("media_deletion_jobs", {
  id: serial("id").primaryKey(),
  ownerId: varchar("owner_id").notNull(),
  path: text("path").notNull(),
  status: varchar("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at").notNull().defaultNow(),
  leaseUntil: timestamp("lease_until"),
  leaseToken: varchar("lease_token"),
  errorCode: varchar("error_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("media_deletion_owner_path").on(table.ownerId, table.path),
  index("media_deletion_due").on(table.status, table.nextAttemptAt),
]);

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  bio: text("bio"),
  age: integer("age"),
  showAge: boolean("show_age").notNull().default(false),
  gender: text("gender"),
  preference: text("preference"),
  personalPreferencesConsentAt: timestamp("personal_preferences_consent_at"),
  personalPreferencesConsentVersion: text("personal_preferences_consent_version"),
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
  availableToday: boolean("available_today").default(false),
  availableUntil: timestamp("available_until"),
  nextAdventure: text("next_adventure"),
  favoriteDestinations: text("favorite_destinations").array().notNull().default([]),
  notRecommendedDestinations: text("not_recommended_destinations").array().notNull().default([]),
  availableAsGuide: boolean("available_as_guide").default(false),
  speaksLanguages: text("speaks_languages").array().default([]),
  learningLanguages: text("learning_languages").array().default([]),
  wantToHelp: boolean("want_to_help").default(false),
  helpWith: text("help_with").array().default([]),
  langLevel: text("lang_level"),
  primaryLang: varchar("primary_lang", { length: 10 }),
  workStatus: text("work_status"),
  aviationOptIn: boolean("aviation_opt_in").notNull().default(false),
  aviationRole: text("aviation_role"),
});

export const aviationRoles = ["cabin_crew", "pilot", "airport_staff", "dispatcher", "maintenance", "other"] as const;
export const layoverActivityTypes = ["coffee", "meal", "sightseeing", "workout", "shopping", "nightlife", "rest", "other"] as const;
export const aviationRoleSchema = z.enum(aviationRoles);
export const layoverActivityTypeSchema = z.enum(layoverActivityTypes);

// Deliberately limited to city, time window and activity. Do not add travel
// operational details or precise-location fields to this privacy-first feature.
export const layovers = pgTable("layovers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  city: text("city").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  activityType: text("activity_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("layovers_active_idx").on(t.startsAt, t.endsAt),
  index("layovers_user_starts_idx").on(t.userId, t.startsAt),
  index("layovers_city_starts_idx").on(t.city, t.startsAt),
]);

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  url: text("url").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, table => [index("photos_user_id_id_idx").on(table.userId, table.id)]);

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  user1Id: varchar("user1_id").notNull().references(() => users.id),
  user2Id: varchar("user2_id").notNull().references(() => users.id),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, table => [index("matches_sender_recipient_idx").on(table.user1Id, table.user2Id)]);

// Explicit opt-in, separate from the languages a member happens to speak.
export const languageHelpers = pgTable("language_helpers", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  offeredLanguages: text("offered_languages").array().notNull().default([]),
});

export const languageExchangeRequests = pgTable("language_exchange_requests", {
  id: serial("id").primaryKey(),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: varchar("to_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  language: varchar("language", { length: 10 }).notNull(),
  status: text("status", { enum: ["pending", "accepted", "declined", "cancelled"] }).notNull().default("pending"),
  matchId: integer("match_id").references(() => matches.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, table => [
  uniqueIndex("language_exchange_pair_language_idx").on(table.fromUserId, table.toUserId, table.language),
  index("language_exchange_recipient_idx").on(table.toUserId, table.status),
]);

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
  imageUrl: text("image_url"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, table => [index("messages_match_id_id_idx").on(table.matchId, table.id)]);

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
}, table => [
  index("blocks_sender_recipient_idx").on(table.userId, table.blockedUserId),
  index("blocks_recipient_sender_idx").on(table.blockedUserId, table.userId),
]);

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
  isOpportunity: boolean("is_opportunity").default(false),
  opportunityType: text("opportunity_type"),
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

export const adventurePhotos = pgTable("adventure_photos", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  photoUrl: text("photo_url").notNull(),
  caption: text("caption"),
  city: text("city"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type AdventurePhoto = typeof adventurePhotos.$inferSelect;
export const insertAdventurePhotoSchema = createInsertSchema(adventurePhotos).omit({ id: true, createdAt: true });

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const nativePushDevices = pgTable("native_push_devices", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  token: text("token").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("native_push_device_token_unique").on(table.platform, table.token),
  index("native_push_devices_user_idx").on(table.userId),
]);

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
  layovers: many(layovers),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const layoversRelations = relations(layovers, ({ one }) => ({
  user: one(users, {
    fields: [layovers.userId],
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
export const insertLayoverSchema = createInsertSchema(layovers).omit({ id: true, userId: true, createdAt: true });
export const layoverPayloadSchema = z.object({
  city: z.string().trim().min(1).max(100),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  activityType: layoverActivityTypeSchema,
}).strict();

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
export type Layover = typeof layovers.$inferSelect;
export type InsertLayover = z.infer<typeof insertLayoverSchema>;

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  refereeId: varchar("referee_id").notNull().references(() => users.id).unique(),
  createdAt: timestamp("created_at").defaultNow(),
  rewardGranted: varchar("reward_granted").default("none"),
});

export type Referral = typeof referrals.$inferSelect;

// ─── Profile Views ───────────────────────────────────────────────────────────
export const profileViews = pgTable("profile_views", {
  id: serial("id").primaryKey(),
  viewerId: varchar("viewer_id").notNull().references(() => users.id),
  viewedId: varchar("viewed_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});
export type ProfileView = typeof profileViews.$inferSelect;

// ─── Stories (24h) ───────────────────────────────────────────────────────────
export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  mediaUrl: text("media_url").notNull(),
  caption: text("caption"),
  audience: text("audience", { enum: ["connections", "everyone"] }).notNull().default("connections"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export type Story = typeof stories.$inferSelect;
export const insertStorySchema = createInsertSchema(stories).omit({ id: true, createdAt: true });
export type InsertStory = z.infer<typeof insertStorySchema>;

// ─── Business Partners ───────────────────────────────────────────────────────
export const businessPartners = pgTable("business_partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  city: text("city").notNull(),
  category: text("category").notNull(),
  contactEmail: text("contact_email").notNull(),
  logoUrl: text("logo_url"),
  website: text("website"),
  status: text("status").default("pending"), // pending | active | inactive
  createdAt: timestamp("created_at").defaultNow(),
});
export type BusinessPartner = typeof businessPartners.$inferSelect;
export const insertBusinessPartnerSchema = createInsertSchema(businessPartners).omit({ id: true, createdAt: true });
export type InsertBusinessPartner = z.infer<typeof insertBusinessPartnerSchema>;

// ─── Local Offers ────────────────────────────────────────────────────────────
export const localOffers = pgTable("local_offers", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").notNull().references(() => businessPartners.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  discount: text("discount"),
  code: text("code"),
  validUntil: timestamp("valid_until"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export type LocalOffer = typeof localOffers.$inferSelect;
export const insertLocalOfferSchema = createInsertSchema(localOffers).omit({ id: true, createdAt: true });
export type InsertLocalOffer = z.infer<typeof insertLocalOfferSchema>;

// ─── City Guide Tips ─────────────────────────────────────────────────────────
export const cityTips = pgTable("city_tips", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  city: text("city").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  votes: integer("votes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export type CityTip = typeof cityTips.$inferSelect;
export const insertCityTipSchema = createInsertSchema(cityTips).omit({ id: true, votes: true, createdAt: true });
export type InsertCityTip = z.infer<typeof insertCityTipSchema>;

export const cityTipVotes = pgTable("city_tip_votes", {
  id: serial("id").primaryKey(),
  tipId: integer("tip_id").notNull().references(() => cityTips.id),
  userId: varchar("user_id").notNull().references(() => users.id),
});

// ─── In-app Notifications ────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // match | message | like | view | event | offer | system
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export type Notification = typeof notifications.$inferSelect;
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// ─── Swipes ──────────────────────────────────────────────────────────────────
export const swipes = pgTable("swipes", {
  id: serial("id").primaryKey(),
  swiperId: varchar("swiper_id").notNull().references(() => users.id),
  swipedId: varchar("swiped_id").notNull().references(() => users.id),
  direction: text("direction").notNull(), // like | pass | superlike
  createdAt: timestamp("created_at").defaultNow(),
});
export type Swipe = typeof swipes.$inferSelect;
export const insertSwipeSchema = createInsertSchema(swipes).omit({ id: true, createdAt: true });
export type InsertSwipe = z.infer<typeof insertSwipeSchema>;

// ─── Ambassador Applications ─────────────────────────────────────────────────
export const appSessions = pgTable("app_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [uniqueIndex("app_sessions_user_date_idx").on(t.userId, t.date)]);
export type AppSession = typeof appSessions.$inferSelect;

export const ambassadorApplications = pgTable("ambassador_applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  city: text("city").notNull(),
  instagram: text("instagram"),
  motivation: text("motivation").notNull(),
  followers: text("followers"),
  status: text("status").default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at").defaultNow(),
});
export type AmbassadorApplication = typeof ambassadorApplications.$inferSelect;
export const insertAmbassadorApplicationSchema = createInsertSchema(ambassadorApplications).omit({ id: true, createdAt: true, status: true });
export type InsertAmbassadorApplication = z.infer<typeof insertAmbassadorApplicationSchema>;

// Local Help Requests — travelers ask for help, locals respond
export const localHelpRequests = pgTable("local_help_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  city: text("city").notNull(),
  category: text("category").notNull(), // recommendation | companion | translator | transport | accommodation | other
  description: text("description").notNull(),
  status: text("status").default("open"), // open | resolved
  budget: integer("budget"), // optional €amount the requester will pay
  createdAt: timestamp("created_at").defaultNow(),
});
export type LocalHelpRequest = typeof localHelpRequests.$inferSelect;
export const insertLocalHelpRequestSchema = createInsertSchema(localHelpRequests).omit({ id: true, createdAt: true, status: true });
export type InsertLocalHelpRequest = z.infer<typeof insertLocalHelpRequestSchema>;

export const localHelpOffers = pgTable("local_help_offers", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => localHelpRequests.id, { onDelete: "cascade" }),
  helperId: varchar("helper_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});
export type LocalHelpOffer = typeof localHelpOffers.$inferSelect;

// ── Travel Packages (Viajes) ──────────────────────────────────────────────────
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  destination: text("destination").notNull(),
  departureDate: timestamp("departure_date").notNull(),
  returnDate: timestamp("return_date"),
  pricePerPerson: integer("price_per_person").notNull(), // in cents (e.g. 50000 = €500)
  capacity: integer("capacity").notNull(),
  coverImageUrl: text("cover_image_url"),
  includedServices: text("included_services"), // free-text list of what's included
  type: text("type").notNull().default("package"), // "package" | "experience"
  isActive: boolean("is_active").default(true),
  featured: boolean("featured").default(false),           // pinned at top as "Oferta destacada"
  originalPricePerPerson: integer("original_price_per_person"), // crossed-out price in cents
  createdAt: timestamp("created_at").defaultNow(),
});
export type Trip = typeof trips.$inferSelect;

export const tripBookings = pgTable("trip_bookings", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripeSessionId: text("stripe_session_id"),
  paymentStatus: text("payment_status").default("pending"), // "pending" | "confirmed" | "failed"
  createdAt: timestamp("created_at").defaultNow(),
});
export type TripBooking = typeof tripBookings.$inferSelect;

export const languageProgress = pgTable("language_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  language: varchar("language", { length: 10 }).notNull(),
  level: varchar("level", { length: 20 }).notNull(),
  lessonId: varchar("lesson_id", { length: 50 }).notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
}, (t) => [uniqueIndex("lang_progress_unique_idx").on(t.userId, t.language, t.lessonId)]);
export type LanguageProgress = typeof languageProgress.$inferSelect;
export const insertLanguageProgressSchema = createInsertSchema(languageProgress).omit({ id: true, completedAt: true });
export type InsertLanguageProgress = z.infer<typeof insertLanguageProgressSchema>;
