export function normalizeManagedMediaPath(raw: unknown, privateDir?: string): string | null {
  if (typeof raw !== "string" || raw.length > 4096) return null;
  let path = raw.split(/[?#]/)[0];
  if (raw.startsWith("https://storage.googleapis.com/")) {
    if (!privateDir) return null;
    const url = new URL(raw);
    const prefix = privateDir.replace(/\/+$/, "") + "/";
    if (!url.pathname.startsWith(prefix)) return null;
    path = "/objects/" + url.pathname.slice(prefix.length);
  }
  // No traversal, arbitrary bucket, remote URL, query credentials or filename.
  if (/^\/uploads\/[a-f0-9]{32}$/.test(path)) return path;
  if (/^\/objects\/uploads\/[0-9a-f-]{36}$/i.test(path)) return path;
  return null;
}

export type MediaDeletionOutcome = "deleted" | "missing" | "ownership_unverified";

export function deletionRetryPolicy(attempts: number) {
  return {
    status: attempts >= 8 ? "review" as const : "retry" as const,
    delayMs: Math.min(6 * 60 * 60 * 1000, 60_000 * 2 ** Math.min(attempts - 1, 9)),
  };
}