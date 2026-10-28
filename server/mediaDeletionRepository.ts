import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users, photos, stories, adventurePhotos, events, messages, uploadedMedia, mediaDeletionJobs,
} from "@shared/schema";
import { normalizeManagedMediaPath } from "./mediaDeletionPolicy";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function recordMediaUpload(ownerId: string, path: string) {
  if (normalizeManagedMediaPath(path) !== path) throw new Error("Invalid managed media path");
  await db.transaction(async (tx) => {
    const owners = await tx.select({ id: users.id }).from(users).where(eq(users.id, ownerId)).for("update");
    if (!owners.length) throw new Error("Upload account no longer exists");
    // Record BEFORE storing bytes. Deletion waits for the upload to finish,
    // including a crash/restart during the write. Cloud retries are <1 hour.
    await tx.insert(uploadedMedia).values({
      ownerId, path, availableAt: new Date(Date.now() + 60 * 60 * 1000),
    }).onConflictDoNothing();
    const [record] = await tx.select().from(uploadedMedia).where(eq(uploadedMedia.path, path));
    if (record.ownerId !== ownerId) throw new Error("Media path has another owner");
  });
}

export async function finishMediaUpload(ownerId: string, path: string) {
  await db.transaction(async (tx) => {
    await tx.update(uploadedMedia).set({ availableAt: new Date() })
      .where(and(eq(uploadedMedia.ownerId, ownerId), eq(uploadedMedia.path, path)));
    await tx.update(mediaDeletionJobs).set({ nextAttemptAt: new Date() })
      .where(and(eq(mediaDeletionJobs.ownerId, ownerId), eq(mediaDeletionJobs.path, path),
        eq(mediaDeletionJobs.status, "pending")));
  });
}

export async function enqueueAccountMediaDeletion(tx: Transaction, ownerId: string): Promise<number> {
  // Serialize account removal with newly starting uploads.
  await tx.execute(sql`SELECT id FROM users WHERE id = ${ownerId} FOR UPDATE`);
  const [accountRows, photoRows, storyRows, albumRows, eventRows, messageRows, uploadRows] = await Promise.all([
    tx.select({ avatar: users.profileImageUrl, selfie: users.verificationSelfieUrl })
      .from(users).where(eq(users.id, ownerId)),
    tx.select({ path: photos.url }).from(photos).where(eq(photos.userId, ownerId)),
    tx.select({ path: stories.mediaUrl }).from(stories).where(eq(stories.userId, ownerId)),
    tx.select({ path: adventurePhotos.photoUrl }).from(adventurePhotos).where(eq(adventurePhotos.userId, ownerId)),
    tx.select({ path: events.imageUrl }).from(events).where(eq(events.creatorId, ownerId)),
    // Never claim the other participant's attachments just because a match ends.
    tx.select({ path: messages.imageUrl }).from(messages).where(eq(messages.senderId, ownerId)),
    tx.select().from(uploadedMedia).where(eq(uploadedMedia.ownerId, ownerId)),
  ]);
  const jobs = new Map<string, Date>();
  for (const reference of [
    ...accountRows.flatMap(row => [row.avatar, row.selfie]),
    ...[...photoRows, ...storyRows, ...albumRows, ...eventRows, ...messageRows].map(row => row.path),
  ]) {
    const path = normalizeManagedMediaPath(reference, process.env.PRIVATE_OBJECT_DIR);
    if (path) jobs.set(path, new Date());
  }
  for (const upload of uploadRows) {
    const path = normalizeManagedMediaPath(upload.path);
    if (path) jobs.set(path, upload.availableAt);
  }
  if (jobs.size) {
    await tx.insert(mediaDeletionJobs).values([...jobs].map(([path, nextAttemptAt]) => ({
      ownerId, path, nextAttemptAt,
    }))).onConflictDoNothing();
  }
  return jobs.size;
}

export type MediaDeletionJob = typeof mediaDeletionJobs.$inferSelect;

export function createMediaDeletionRepository(database: Pick<typeof db, "execute" | "transaction" | "update"> = db) {
const db = database;
return {
  async claim(): Promise<MediaDeletionJob[]> {
    const token = randomUUID();
    const result = await db.execute(sql`
      UPDATE media_deletion_jobs AS job
      SET status = 'processing', attempts = attempts + 1,
          lease_until = now() + interval '30 minutes', lease_token = ${token}
      WHERE job.id IN (
        SELECT candidate.id FROM media_deletion_jobs AS candidate
        WHERE (
          (candidate.status IN ('pending','retry') AND candidate.next_attempt_at <= now())
          OR (candidate.status = 'processing' AND candidate.lease_until < now())
        )
        AND NOT EXISTS (SELECT 1 FROM users WHERE users.id = candidate.owner_id)
        ORDER BY candidate.id LIMIT 3 FOR UPDATE SKIP LOCKED
      )
      RETURNING job.id, owner_id AS "ownerId", path, status, attempts,
        next_attempt_at AS "nextAttemptAt", lease_until AS "leaseUntil",
        lease_token AS "leaseToken", error_code AS "errorCode", created_at AS "createdAt"
    `);
    return result.rows as MediaDeletionJob[];
  },
  async complete(job: MediaDeletionJob) {
    await db.transaction(async (tx) => {
      const removed = await tx.delete(mediaDeletionJobs)
        .where(and(eq(mediaDeletionJobs.id, job.id), eq(mediaDeletionJobs.leaseToken, job.leaseToken!)))
        .returning({ id: mediaDeletionJobs.id });
      if (removed.length) {
        await tx.delete(uploadedMedia).where(and(eq(uploadedMedia.path, job.path),
          eq(uploadedMedia.ownerId, job.ownerId)));
      }
    });
  },
  async postpone(job: MediaDeletionJob, status: "retry" | "review", errorCode: string, delayMs: number) {
    await db.update(mediaDeletionJobs).set({
      status, errorCode, nextAttemptAt: new Date(Date.now() + delayMs),
      leaseUntil: null, leaseToken: null,
    }).where(and(eq(mediaDeletionJobs.id, job.id), eq(mediaDeletionJobs.leaseToken, job.leaseToken!)));
  },
};
}
export const mediaDeletionRepository = createMediaDeletionRepository();

export async function getMediaCleanupSummary() {
  const counts = await db.select({
    status: mediaDeletionJobs.status, count: sql<number>`count(*)::integer`,
  }).from(mediaDeletionJobs).groupBy(mediaDeletionJobs.status);
  const review = await db.select({
    id: mediaDeletionJobs.id, path: mediaDeletionJobs.path,
    errorCode: mediaDeletionJobs.errorCode, attempts: mediaDeletionJobs.attempts,
  }).from(mediaDeletionJobs).where(eq(mediaDeletionJobs.status, "review"))
    .orderBy(desc(mediaDeletionJobs.createdAt)).limit(20);
  return { enabled: process.env.NODE_ENV === "production",
    counts: Object.fromEntries(counts.map(row => [row.status, row.count])), review };
}

export async function retryMediaCleanup(ids: number[]) {
  await db.update(mediaDeletionJobs).set({
    status: "pending", nextAttemptAt: new Date(), errorCode: null,
    leaseToken: null, leaseUntil: null,
  }).where(and(inArray(mediaDeletionJobs.id, ids), inArray(mediaDeletionJobs.status, ["review", "retry"])));
}