
import { db } from "./db";
import { 
  users, profiles, photos, matches, ratings, messages, prompts, 
  promptResponses, superLikes, preferences, blockedUsers, reports,
  notifications, appSessions, referrals, profileViews, stories, sessions,
  eventParticipants, eventComments, eventRatings, pushSubscriptions,
  cityTips, cityTipVotes, swipes, adventurePhotos, events, ambassadorApplications,
  type User, type Profile, type InsertProfile, type Photo, type Match, 
  type Rating, type Message, type InsertMessage, type Prompt, 
  type PromptResponse, type SuperLike, type Preferences, type InsertPreferences,
  type Report, type InsertReport
} from "@shared/schema";
import { eq, or, and, ne, sql, desc, gte, isNotNull, inArray } from "drizzle-orm";
import { publicUserColumns, type PublicUser } from "./publicUser";
import { EndedMatchConnectionError, resolveMatchTransition } from "./matchTransitions";
import { enqueueAccountMediaDeletion } from "./mediaDeletionRepository";

export { EndedMatchConnectionError } from "./matchTransitions";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getProfile(userId: string): Promise<Profile | undefined>;
  upsertProfile(userId: string, profile: Partial<InsertProfile>): Promise<Profile>;
  
  createPhoto(photo: typeof photos.$inferInsert): Promise<Photo>;
  getPhotos(userId: string): Promise<Photo[]>;
  deletePhoto(id: number): Promise<void>;

  createMatch(user1Id: string, user2Id: string): Promise<Match | undefined>;
  connectMatch(user1Id: string, user2Id: string): Promise<MatchConnectionResult>;
  getMatchConnection(user1Id: string, user2Id: string): Promise<Match | undefined>;
  getPendingMatchRequests(userId: string, direction?: "sent" | "incoming"): Promise<Match[]>;
  getMatches(userId: string): Promise<Match[]>;
  endMatch(matchId: number, reason: string): Promise<void>;
  getPotentialMatches(userId: string): Promise<PublicUser[]>;
  
  createRating(rating: typeof ratings.$inferInsert): Promise<Rating>;
  getRatings(matchId: number): Promise<Rating[]>;

  updateUserStripeInfo(userId: string, stripeInfo: Partial<User>): Promise<User | undefined>;
  getUsersWhoLikedMe(userId: string): Promise<User[]>;
  canUserLike(userId: string): Promise<{ canLike: boolean; remainingLikes: number; isPremium: boolean }>;
  incrementDailyLikes(userId: string): Promise<void>;
}

export type MatchConnectionResult = {
  match: Match;
  isMatch: boolean;
  created: boolean;
  becameMatch: boolean;
};

export class DatabaseStorage implements IStorage {
  constructor(private readonly deletionDb: typeof db = db) {}

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }

  async upsertProfile(userId: string, profileData: Partial<InsertProfile>): Promise<Profile> {
    // Check if profile exists
    const existing = await this.getProfile(userId);
    if (existing) {
      const [updated] = await db.update(profiles)
        .set(profileData)
        .where(eq(profiles.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(profiles)
        .values({ ...profileData, userId } as any)
        .returning();
      return created;
    }
  }

  async createPhoto(photo: typeof photos.$inferInsert): Promise<Photo> {
    const [newPhoto] = await db.insert(photos).values(photo).returning();
    return newPhoto;
  }

  async getPhotos(userId: string): Promise<Photo[]> {
    return db.select().from(photos).where(eq(photos.userId, userId));
  }

  async deletePhoto(id: number): Promise<void> {
    await db.delete(photos).where(eq(photos.id, id));
  }

  async createMatch(user1Id: string, user2Id: string): Promise<Match | undefined> {
    const result = await this.connectMatch(user1Id, user2Id);
    return result.match;
  }

  async getMatchConnection(user1Id: string, user2Id: string): Promise<Match | undefined> {
    const [existing] = await db.select().from(matches)
      .where(or(
        and(eq(matches.user1Id, user1Id), eq(matches.user2Id, user2Id)),
        and(eq(matches.user1Id, user2Id), eq(matches.user2Id, user1Id)),
      ));
    return existing;
  }

  async connectMatch(user1Id: string, user2Id: string): Promise<MatchConnectionResult> {
    if (user1Id === user2Id) throw new Error("You cannot connect with yourself");

    const existingRows = await db.select().from(matches)
      .where(or(
        and(eq(matches.user1Id, user1Id), eq(matches.user2Id, user2Id)),
        and(eq(matches.user1Id, user2Id), eq(matches.user2Id, user1Id)),
      ));
    const transition = resolveMatchTransition(user1Id, user2Id, existingRows);

    if (transition.action === "return") {
      return {
        match: transition.match,
        isMatch: transition.isMatch,
        created: false,
        becameMatch: false,
      };
    }
    if (transition.action === "accept") {
      const [match] = await db.update(matches)
        .set({ status: "matched" })
        .where(and(eq(matches.id, transition.match.id), eq(matches.status, "pending")))
        .returning();
      if (match) return { match, isMatch: true, created: false, becameMatch: true };
      // The row changed concurrently; re-read rather than reporting a stale transition.
      const current = await this.getMatchConnection(user1Id, user2Id);
      if (!current) throw new Error("Connection changed before it could be accepted");
      if (current.status === "ended") throw new EndedMatchConnectionError();
      return { match: current, isMatch: current.status === "matched", created: false, becameMatch: false };
    }

    const [match] = await db.insert(matches)
      .values({ user1Id, user2Id, status: "pending" })
      .returning();
    return { match, isMatch: false, created: true, becameMatch: false };
  }

  async getPendingMatchRequests(userId: string, direction: "sent" | "incoming" = "sent"): Promise<Match[]> {
    return db.select().from(matches).where(
      and(
        eq(direction === "incoming" ? matches.user2Id : matches.user1Id, userId),
        eq(matches.status, "pending"),
      )
    ).orderBy(desc(matches.createdAt), desc(matches.id));
  }

  async getMatchById(matchId: number): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
    return match;
  }

  async getMatches(userId: string): Promise<Match[]> {
    return db.select().from(matches).where(
      and(
        eq(matches.status, 'matched'),
        or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))
      )
    );
  }

  async endMatch(matchId: number, reason: string): Promise<void> {
    await db.update(matches)
      .set({ status: 'ended' })
      .where(eq(matches.id, matchId));
  }

  async getPotentialMatches(userId: string): Promise<PublicUser[]> {
    // Exclude self, banned users, very new accounts (<24h), and users with no photo
    const minAge = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return db.select(publicUserColumns).from(users).where(
      and(
        ne(users.id, userId),
        eq(users.isBanned, 'false'),
        sql`${users.createdAt} < ${minAge}`,
        or(
          isNotNull(users.profileImageUrl),
          sql`EXISTS (SELECT 1 FROM photos WHERE photos.user_id = ${users.id})`
        )
      )
    );
  }

  async createRating(rating: typeof ratings.$inferInsert): Promise<Rating> {
    const [newRating] = await db.insert(ratings).values(rating).returning();
    return newRating;
  }

  async getRatings(matchId: number): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.matchId, matchId));
  }

  async updateUserStripeInfo(userId: string, stripeInfo: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(stripeInfo)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUsersWhoLikedMe(userId: string): Promise<User[]> {
    const pendingMatches = await db.select({ user1Id: matches.user1Id })
      .from(matches)
      .where(and(
        eq(matches.user2Id, userId),
        eq(matches.status, 'pending')
      ));
    
    const userIds = pendingMatches.map(m => m.user1Id);
    if (userIds.length === 0) return [];
    
    return db.select().from(users).where(inArray(users.id, userIds));
  }

  async canUserLike(userId: string): Promise<{ canLike: boolean; remainingLikes: number; isPremium: boolean }> {
    const user = await this.getUser(userId);
    if (!user) return { canLike: false, remainingLikes: 0, isPremium: false };

    const isPremium = user.isPremium === 'true' || 
      (user.trialEndsAt && new Date(user.trialEndsAt) > new Date());

    if (isPremium) {
      return { canLike: true, remainingLikes: 999, isPremium: true };
    }

    const FREE_DAILY_LIKES = 10;
    const today = new Date().toDateString();
    const lastReset = user.lastLikeResetDate ? new Date(user.lastLikeResetDate).toDateString() : null;
    
    if (lastReset !== today) {
      await db.update(users)
        .set({ dailyLikesUsed: '0', lastLikeResetDate: new Date() })
        .where(eq(users.id, userId));
      return { canLike: true, remainingLikes: FREE_DAILY_LIKES, isPremium: false };
    }

    const likesUsed = parseInt(user.dailyLikesUsed || '0', 10);
    const remaining = Math.max(0, FREE_DAILY_LIKES - likesUsed);
    
    return { canLike: remaining > 0, remainingLikes: remaining, isPremium: false };
  }

  async incrementDailyLikes(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;
    
    const currentLikes = parseInt(user.dailyLikesUsed || '0', 10);
    await db.update(users)
      .set({ dailyLikesUsed: String(currentLikes + 1) })
      .where(eq(users.id, userId));
  }

  async getStripeProducts() {
    const result = await db.execute(sql`
      SELECT * FROM stripe.products WHERE active = true
    `);
    return result.rows;
  }

  async getStripePrices() {
    const result = await db.execute(sql`
      SELECT * FROM stripe.prices WHERE active = true
    `);
    return result.rows;
  }

  async getProductsWithPrices() {
    const result = await db.execute(sql`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.description as product_description,
        p.metadata as product_metadata,
        pr.id as price_id,
        pr.unit_amount,
        pr.currency,
        pr.recurring
      FROM stripe.products p
      LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      WHERE p.active = true
      ORDER BY pr.unit_amount
    `);
    return result.rows;
  }

  async updateUserByStripeCustomerId(stripeCustomerId: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(data)
      .where(eq(users.stripeCustomerId, stripeCustomerId))
      .returning();
    return user;
  }

  // Messages
  async getMessages(matchId: number): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.matchId, matchId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessagesAsRead(matchId: number, userId: string): Promise<void> {
    await db.update(messages)
      .set({ readAt: new Date() })
      .where(and(
        eq(messages.matchId, matchId),
        ne(messages.senderId, userId),
        sql`${messages.readAt} IS NULL`
      ));
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const userMatches = await this.getMatches(userId);
    let count = 0;
    for (const match of userMatches) {
      if (match.status === 'matched') {
        const unread = await db.select().from(messages)
          .where(and(
            eq(messages.matchId, match.id),
            ne(messages.senderId, userId),
            sql`${messages.readAt} IS NULL`
          ));
        count += unread.length;
      }
    }
    return count;
  }

  // Prompts
  async getAllPrompts(): Promise<Prompt[]> {
    return db.select().from(prompts);
  }

  async getPromptResponses(userId: string): Promise<(PromptResponse & { prompt: Prompt })[]> {
    const responses = await db.select().from(promptResponses)
      .where(eq(promptResponses.userId, userId));
    
    const result = [];
    for (const response of responses) {
      const [prompt] = await db.select().from(prompts).where(eq(prompts.id, response.promptId));
      if (prompt) {
        result.push({ ...response, prompt });
      }
    }
    return result;
  }

  async upsertPromptResponse(userId: string, promptId: number, answer: string): Promise<PromptResponse> {
    const [existing] = await db.select().from(promptResponses)
      .where(and(eq(promptResponses.userId, userId), eq(promptResponses.promptId, promptId)));
    
    if (existing) {
      const [updated] = await db.update(promptResponses)
        .set({ answer })
        .where(eq(promptResponses.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(promptResponses)
        .values({ userId, promptId, answer })
        .returning();
      return created;
    }
  }

  // Super Likes
  async canUserSuperLike(userId: string): Promise<{ canSuperLike: boolean; remaining: number }> {
    const user = await this.getUser(userId);
    if (!user) return { canSuperLike: false, remaining: 0 };

    const isPremium = user.isPremium === 'true';
    const dailyLimit = isPremium ? 5 : 1;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastReset = user.lastSuperLikeResetDate ? new Date(user.lastSuperLikeResetDate) : null;
    
    if (!lastReset || lastReset < today) {
      await db.update(users)
        .set({ dailySuperLikesUsed: '0', lastSuperLikeResetDate: today })
        .where(eq(users.id, userId));
      return { canSuperLike: true, remaining: dailyLimit };
    }

    const used = parseInt(user.dailySuperLikesUsed || '0');
    const remaining = Math.max(0, dailyLimit - used);
    return { canSuperLike: remaining > 0, remaining };
  }

  async createSuperLike(fromUserId: string, toUserId: string): Promise<SuperLike | null> {
    const status = await this.canUserSuperLike(fromUserId);
    if (!status.canSuperLike) return null;

    const user = await this.getUser(fromUserId);
    const used = parseInt(user?.dailySuperLikesUsed || '0');
    await db.update(users)
      .set({ dailySuperLikesUsed: String(used + 1) })
      .where(eq(users.id, fromUserId));

    const [superLike] = await db.insert(superLikes)
      .values({ fromUserId, toUserId })
      .returning();
    return superLike;
  }

  async getSuperLikesReceived(userId: string): Promise<SuperLike[]> {
    return db.select().from(superLikes)
      .where(eq(superLikes.toUserId, userId))
      .orderBy(desc(superLikes.createdAt));
  }

  // Preferences
  async getPreferences(userId: string): Promise<Preferences | undefined> {
    const [prefs] = await db.select().from(preferences).where(eq(preferences.userId, userId));
    return prefs;
  }

  async upsertPreferences(userId: string, prefs: Partial<InsertPreferences>): Promise<Preferences> {
    const existing = await this.getPreferences(userId);
    if (existing) {
      const [updated] = await db.update(preferences)
        .set(prefs)
        .where(eq(preferences.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(preferences)
        .values({ ...prefs, userId } as any)
        .returning();
      return created;
    }
  }

  // Block & Report
  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    await db.insert(blockedUsers).values({ userId, blockedUserId });
  }

  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    await db.delete(blockedUsers).where(
      and(eq(blockedUsers.userId, userId), eq(blockedUsers.blockedUserId, blockedUserId))
    );
  }

  async getBlockedUsers(userId: string): Promise<string[]> {
    const blocked = await db.select().from(blockedUsers).where(eq(blockedUsers.userId, userId));
    return blocked.map(b => b.blockedUserId);
  }

  async reportUser(report: InsertReport): Promise<Report> {
    const [newReport] = await db.insert(reports).values(report).returning();
    return newReport;
  }

  // Verification
  async verifyUser(userId: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ isVerified: 'true', verifiedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserLocation(userId: string, location: string, lat?: string, lng?: string): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ location, latitude: lat, longitude: lng })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Admin functions
  async getReports(): Promise<Report[]> {
    return db.select().from(reports).orderBy(desc(reports.createdAt));
  }

  async resolveReport(reportId: number): Promise<void> {
    await db.update(reports)
      .set({ status: 'resolved' })
      .where(eq(reports.id, reportId));
  }

  // Delete account functions
  async deleteUserPhotos(userId: string): Promise<void> {
    await db.delete(photos).where(eq(photos.userId, userId));
  }

  async deleteProfile(userId: string): Promise<void> {
    await db.delete(profiles).where(eq(profiles.userId, userId));
  }

  async deleteUserMatches(userId: string): Promise<void> {
    await this.deletionDb.transaction(async (tx) => {
      const ownedMatches = await tx.select({ id: matches.id }).from(matches).where(
        or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))
      );
      const matchIds = ownedMatches.map(({ id }) => id);
      if (matchIds.length > 0) {
        // Messages and ratings reference the match, so remove them before the FK owner.
        await tx.delete(messages).where(inArray(messages.matchId, matchIds));
        await tx.delete(ratings).where(inArray(ratings.matchId, matchIds));
        await tx.delete(matches).where(inArray(matches.id, matchIds));
      }
    });
  }

  async deleteUserMessages(userId: string): Promise<void> {
    await this.deletionDb.transaction(async (tx) => {
      const ownedMatches = await tx.select({ id: matches.id }).from(matches).where(
        or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))
      );
      const matchIds = ownedMatches.map(({ id }) => id);
      await tx.delete(messages).where(matchIds.length
        ? or(eq(messages.senderId, userId), inArray(messages.matchId, matchIds))
        : eq(messages.senderId, userId));
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.deleteUserAccount(userId);
  }

  async deleteUserAccount(userId: string): Promise<{ queuedMedia: number }> {
    return this.deletionDb.transaction(async (tx) => {
      const queuedMedia = await enqueueAccountMediaDeletion(tx, userId);
      const ownedMatches = await tx.select({ id: matches.id }).from(matches).where(
        or(eq(matches.user1Id, userId), eq(matches.user2Id, userId))
      );
      const ownedEvents = await tx.select({ id: events.id }).from(events).where(eq(events.creatorId, userId));
      const ownedTips = await tx.select({ id: cityTips.id }).from(cityTips).where(eq(cityTips.userId, userId));
      const matchIds = ownedMatches.map(({ id }) => id);
      const eventIds = ownedEvents.map(({ id }) => id);
      const tipIds = ownedTips.map(({ id }) => id);

      // Remove dependents before their referenced matches/events/tips. The schema
      // has no cascade for event/tip dependents, so rows belonging to other users
      // that reference content owned by this account must also be removed.
      await tx.delete(messages).where(matchIds.length
        ? or(eq(messages.senderId, userId), inArray(messages.matchId, matchIds))
        : eq(messages.senderId, userId));
      await tx.delete(ratings).where(matchIds.length
        ? or(eq(ratings.raterId, userId), inArray(ratings.matchId, matchIds))
        : eq(ratings.raterId, userId));
      await tx.delete(eventParticipants).where(eventIds.length
        ? or(eq(eventParticipants.userId, userId), inArray(eventParticipants.eventId, eventIds))
        : eq(eventParticipants.userId, userId));
      await tx.delete(eventComments).where(eventIds.length
        ? or(eq(eventComments.userId, userId), inArray(eventComments.eventId, eventIds))
        : eq(eventComments.userId, userId));
      await tx.delete(eventRatings).where(eventIds.length
        ? or(eq(eventRatings.userId, userId), inArray(eventRatings.eventId, eventIds))
        : eq(eventRatings.userId, userId));
      await tx.delete(cityTipVotes).where(tipIds.length
        ? or(eq(cityTipVotes.userId, userId), inArray(cityTipVotes.tipId, tipIds))
        : eq(cityTipVotes.userId, userId));

      if (matchIds.length) await tx.delete(matches).where(inArray(matches.id, matchIds));
      if (eventIds.length) await tx.delete(events).where(inArray(events.id, eventIds));
      if (tipIds.length) await tx.delete(cityTips).where(inArray(cityTips.id, tipIds));

      await tx.delete(photos).where(eq(photos.userId, userId));
      await tx.delete(profiles).where(eq(profiles.userId, userId));
      await tx.delete(superLikes).where(or(eq(superLikes.fromUserId, userId), eq(superLikes.toUserId, userId)));
      await tx.delete(blockedUsers).where(or(eq(blockedUsers.userId, userId), eq(blockedUsers.blockedUserId, userId)));
      await tx.delete(reports).where(or(eq(reports.reporterId, userId), eq(reports.reportedUserId, userId)));
      await tx.delete(preferences).where(eq(preferences.userId, userId));
      await tx.delete(promptResponses).where(eq(promptResponses.userId, userId));
      await tx.delete(notifications).where(or(
        eq(notifications.userId, userId),
        and(eq(notifications.type, "solidarity_interest"), eq(notifications.link, `/local-help?ideaFrom=${encodeURIComponent(userId)}`)),
      ));
      await tx.delete(appSessions).where(eq(appSessions.userId, userId));
      await tx.delete(referrals).where(or(eq(referrals.referrerId, userId), eq(referrals.refereeId, userId)));
      await tx.delete(profileViews).where(or(eq(profileViews.viewerId, userId), eq(profileViews.viewedId, userId)));
      await tx.delete(stories).where(eq(stories.userId, userId));
      await tx.delete(swipes).where(or(eq(swipes.swiperId, userId), eq(swipes.swipedId, userId)));
      await tx.delete(adventurePhotos).where(eq(adventurePhotos.userId, userId));
      await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
      await tx.delete(sessions).where(sql`${sessions.sess}->>'userId' = ${userId}`);
      // These optional applicant references have no cascade but can contain personal data.
      await tx.delete(ambassadorApplications).where(eq(ambassadorApplications.userId, userId));

      // FKs explicitly configured with onDelete:cascade clean up layovers,
      // local-help content/offers, trip bookings, and language progress.
      await tx.delete(users).where(eq(users.id, userId));
      return { queuedMedia };
    });
  }
}

export const storage = new DatabaseStorage();
