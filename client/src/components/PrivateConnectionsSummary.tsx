import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { LockKeyhole, MapPin, RotateCw, Users } from "lucide-react";
import { connectionSummarySchema } from "@shared/connection-summary";
import { useI18n } from "@/lib/i18n";
import { privateConnectionsCopy } from "@/components/private-connections-copy";

type PrivateConnectionsSummaryProps = {
  userId: string | number;
};

export function PrivateConnectionsSummary({ userId }: PrivateConnectionsSummaryProps) {
  const { language } = useI18n();
  const copy = privateConnectionsCopy[language];
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["/api/my-connected-cities", userId],
    enabled: Boolean(userId),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: () => document.visibilityState === "visible" ? 30_000 : false,
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/my-connected-cities", {
        credentials: "include",
        signal,
      });
      if (!response.ok) throw new Error("Unable to load connection summary");
      return connectionSummarySchema.parse(await response.json());
    },
  });

  return (
    <section
      className="rounded-2xl border border-primary/15 bg-card p-4 shadow-sm sm:p-5"
      data-testid="section-private-connections"
      aria-labelledby="private-connections-title"
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Users className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="private-connections-title" className="font-display text-base font-bold leading-tight">
            {copy.title}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {copy.privacy}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-3" role="status" aria-live="polite">
          <span className="sr-only">{copy.loading}</span>
          <div className="h-7 w-44 animate-pulse rounded-md bg-muted" />
          <div className="h-14 animate-pulse rounded-xl bg-muted/70" />
        </div>
      ) : isError || !data ? (
        <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3" role="alert">
          <p className="text-sm text-foreground">{copy.error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            data-testid="button-retry-connections"
            className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-wait disabled:opacity-60"
          >
            <RotateCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
            {copy.retry}
          </button>
        </div>
      ) : (
        <>
          <p className="mt-4 text-2xl font-bold tracking-tight" data-testid="text-connection-count">
            {copy.count(data.totalConnections)}
          </p>

          {data.totalConnections === 0 && (
            <div className="mt-3 rounded-xl bg-muted/55 px-3.5 py-3">
              <p className="text-sm font-semibold">{copy.zeroTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.zeroDescription}</p>
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-border/70 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" data-testid="connection-origins">
                {copy.origins}
              </h3>
              {data.origins.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.origins.map((origin) => (
                    <span key={origin} className="max-w-full break-words rounded-full bg-primary/8 px-2.5 py-1 text-xs font-medium text-foreground">
                      {origin}
                    </span>
                  ))}
                </div>
              ) : <p className="mt-2 text-xs text-muted-foreground">—</p>}
              {data.hasMoreOrigins && <p className="mt-2 text-xs leading-snug text-muted-foreground">{copy.moreOrigins}</p>}
            </div>
            <div className="min-w-0 rounded-xl border border-border/70 p-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground" data-testid="connection-current-cities">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {copy.cities}
              </h3>
              {data.cities.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.cities.map((city) => (
                    <span key={city} className="max-w-full break-words rounded-full bg-primary/8 px-2.5 py-1 text-xs font-medium text-foreground">
                      {city}
                    </span>
                  ))}
                </div>
              ) : <p className="mt-2 text-xs text-muted-foreground">—</p>}
              {data.hasMoreCities && <p className="mt-2 text-xs leading-snug text-muted-foreground">{copy.moreCities}</p>}
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{copy.missing}</p>
          <Link
            href="/matches"
            className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-primary/20 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {copy.viewConnections}
          </Link>
        </>
      )}
    </section>
  );
}
