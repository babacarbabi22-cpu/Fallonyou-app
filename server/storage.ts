
import { db } from "./db";
import { 
  users, profiles, photos, matches, ratings, messages, prompts, 
  promptResponses, superLikes, preferences, blockedUsers, reports,
  type User, type Profile, type InsertProfile, type Photo, type Match, 
  type Rating, type Message, type InsertMessage, type Prompt, 
  type PromptResponse, type SuperLike, type Preferences, type InsertPreferences,
  type Report, type InsertReport
} from "@shared/schema";
import { eq, or, and, ne, sql, desc, gte } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getProfile(userId: string): Promise<Profile | undefined>;
  upsertProfile(userId: string, profile: Partial<InsertProfile>): Promise<Profile>;
  
  createPhoto(photo: typeof photos.$inferInsert): Promise<Photo>;
  getPhotos(userId: string): Promise<Photo[]>;
  deletePhoto(id: number): Promise<void>;

  createMatch(user1Id: string, user2Id: string): Promise<Match | undefined>;
  getMatches(userId: string): Promise<Match[]>;
  getPotentialMatches(userId: string): Promise<User[]>;
  
  createRating(rating: typeof ratings.$inferInsert): Promise<Rating>;
  getRatings(matchId: number): Promise<Rating[]>;

  updateUserStripeInfo(userId: string, stripeInfo: Partial<User>): Promise<User | undefined>;
  getUsersWhoLikedMe(userId: string): Promise<User[]>;
  canUserLike(userId: string): Promise<{ canLike: boolean; remainingLikes: number; isPremium: boolean }>;
  incrementDailyLikes(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
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
    const [existing] = await db.select().from(matches)
      .where(and(eq(matches.user1Id, user2Id), eq(matches.user2Id, user1Id)));
      
    if (existing) {
      const [updated] = await db.update(matches)
        .set({ status: 'matched' })
        .where(eq(matches.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(matches)
        .values({ user1Id, user2Id, status: 'pending' })
        .returning();
      return created;
    }
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

  async getPotentialMatches(userId: string): Promise<User[]> {
    // MVP: Get all users except self
    // Real implementation should exclude swiped users
    return db.select().from(users).where(ne(users.id, userId));
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
    const pendingMatches = await db.select()
      .from(matches)
      .where(and(
        eq(matches.user2Id, userId),
        eq(matches.status, 'pending')
      ));
    
    const userIds = pendingMatches.map(m => m.user1Id);
    if (userIds.length === 0) return [];
    
    const likedByUsers = await Promise.all(
      userIds.map(id => this.getUser(id))
    );
    return likedByUsers.filter(Boolean) as User[];
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
}

export const storage = new DatabaseStorage();
