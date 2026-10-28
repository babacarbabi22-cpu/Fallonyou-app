import { db } from "./db";
import { users, photos } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { hasProfilePhoto } from "@shared/profile-photo";

export async function userHasProfilePhoto(userId: string): Promise<boolean> {
  const [[user], images] = await Promise.all([
    db.select({ profileImageUrl: users.profileImageUrl }).from(users).where(eq(users.id, userId)).limit(1),
    db.select({ url: photos.url, type: photos.type }).from(photos)
      .where(and(eq(photos.userId, userId), eq(photos.type, "image"))).limit(1),
  ]);
  return hasProfilePhoto({ ...user, photos: images });
}
