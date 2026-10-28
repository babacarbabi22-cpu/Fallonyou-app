import { ObjectStorageService } from "./replit_integrations/object_storage/objectStorage";
import { deleteOwnedLocalMedia } from "./localMediaOwnership";
import { deletionRetryPolicy, type MediaDeletionOutcome } from "./mediaDeletionPolicy";
import { mediaDeletionRepository, type MediaDeletionJob } from "./mediaDeletionRepository";

type Repository = typeof mediaDeletionRepository;
type DeleteFile = (job: MediaDeletionJob) => Promise<MediaDeletionOutcome>;

export async function processMediaDeletionQueue(repository: Repository, deleteFile: DeleteFile) {
  const jobs = await repository.claim();
  await Promise.all(jobs.map(async (job) => {
    try {
      const result = await deleteFile(job);
      if (result === "ownership_unverified") {
        await repository.postpone(job, "review", result, 0);
      } else {
        await repository.complete(job);
      }
    } catch {
      const retry = deletionRetryPolicy(job.attempts);
      // Do not retain provider error strings, private URLs or user details.
      await repository.postpone(job, retry.status, "storage_unavailable", retry.delayMs);
    }
  }));
}

let started = false;
export function startMediaDeletionWorker() {
  if (process.env.NODE_ENV !== "production") {
    console.log("[Media cleanup] Real storage deletion disabled in development; use fixture tests");
    return;
  }
  if (started) return;
  started = true;
  let running = false;
  const storage = new ObjectStorageService();
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await processMediaDeletionQueue(mediaDeletionRepository, async job => {
        const secret = process.env.SESSION_SECRET || "";
        if (!secret) throw new Error("Ownership signing is unavailable");
        return job.path.startsWith("/uploads/")
          ? deleteOwnedLocalMedia(job.ownerId, job.path, secret)
          : storage.deleteOwnedPrivateUpload(job.ownerId, job.path, secret);
      });
    } catch {
      console.error("[Media cleanup] Queue processing failed; pending jobs retained");
    } finally { running = false; }
  };
  const timer = setInterval(() => void run(), 60_000);
  timer.unref();
  void run();
}