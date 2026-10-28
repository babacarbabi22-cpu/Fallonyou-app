function timestamp(value: Date | string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
}

export function sortConnectionsNewestFirst<T extends { id: number; createdAt: Date | string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aTime = timestamp(a.createdAt), bTime = timestamp(b.createdAt);
    return aTime === bTime ? b.id - a.id : aTime > bTime ? -1 : 1;
  });
}

export function formatConnectionTime(value: Date | string | null, language: string): string | null {
  const time = timestamp(value);
  if (!Number.isFinite(time)) return null;
  return new Intl.DateTimeFormat(language, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(time));
}
