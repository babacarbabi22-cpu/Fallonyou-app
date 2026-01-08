
import { db } from "./db";
import { users, profiles, photos, matches, ratings, type User, type Profile, type InsertProfile, type Photo, type Match, type Rating } from "@shared/schema";
import { eq, or, and, ne } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
