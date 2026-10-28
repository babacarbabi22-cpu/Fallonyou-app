import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Clock, Loader2, UserRound, ArrowUpRight } from "lucide-react";
import { useSentConnectionRequests, useSwipeRight } from "@/hooks/use-danceme";
import { useI18n } from "@/lib/i18n";
import { connectionCopy } from "@/lib/connection-copy";
import { sortConnectionsNewestFirst, formatConnectionTime } from "@shared/connection-time";
import { Button } from "@/components/ui/button";
import { ConnectionSafetyActions } from "@/components/ConnectionSafetyActions";

export function SentConnectionRequests() {
  const { language, t } = useI18n();
  const copy = connectionCopy[language];
  const [, navigate] = useLocation();
  const incomingQuery = useSentConnectionRequests("incoming");
  const sentQuery = useSentConnectionRequests("sent");
  const acceptRequest = useSwipeRight();
  const [unconfirmedId, setUnconfirmedId] = useState<number | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const incomingRows = useMemo(() => {
    const current = (incomingQuery.data ?? []).filter(row => !blockedUserIds.includes(row.otherUser.id));
    return sortConnectionsNewestFirst(current);
  }, [incomingQuery.data, blockedUserIds]);
  const sentRows = useMemo(() => sortConnectionsNewestFirst((sentQuery.data ?? []).filter(row => !blockedUserIds.includes(row.otherUser.id))), [sentQuery.data, blockedUserIds]);
  const [activeTab, setActiveTab] = useState<"incoming" | "sent" | null>(null);
  const tab = activeTab ?? (incomingRows.length ? "incoming" : "sent");

  if (incomingQuery.isLoading && sentQuery.isLoading) {
    return (
      <section aria-label={copy.incomingRequests} className="mb-5 space-y-3" data-testid="connection-requests-loading">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
      </section>
    );
  }
  if (!incomingQuery.isError && !sentQuery.isError && !incomingRows.length && !sentRows.length) return null;

  const rows = tab === "incoming" ? incomingRows : sentRows;
  const query = tab === "incoming" ? incomingQuery : sentQuery;

  return (
    <section className="mb-5 space-y-3" aria-labelledby="connection-requests-heading" data-testid="connection-requests">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="connection-requests-heading" className="text-base font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          {tab === "incoming" ? copy.incomingRequests : copy.sentRequests}
          <span className="text-muted-foreground">({tab === "incoming" ? incomingRows.length : sentRows.length})</span>
        </h2>
        <div className="flex shrink-0 rounded-lg bg-muted p-0.5" role="tablist" aria-label={copy.incomingRequests}>
          <button
            type="button" role="tab" aria-selected={tab === "incoming"} onClick={() => setActiveTab("incoming")}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${tab === "incoming" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            data-testid="incoming-tab"
          >
            {copy.incomingTab} ({incomingRows.length})
          </button>
          <button
            type="button" role="tab" aria-selected={tab === "sent"} onClick={() => setActiveTab("sent")}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${tab === "sent" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            data-testid="sent-tab"
          >
            {copy.sentTab} ({sentRows.length})
          </button>
        </div>
      </div>
      {acceptRequest.isError && <p role="alert" className="text-sm text-destructive" data-testid="accept-request-error">{copy.acceptError}</p>}
      {unconfirmedId !== null && <p role="status" className="text-sm text-muted-foreground">{copy.awaitingResponse}</p>}
      {query.isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm" role="status" data-testid="requests-load-error">
          <p>{tab === "incoming" ? copy.incomingRequestsLoadError : copy.requestsLoadError}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => query.refetch()}>{t.common.retry}</Button>
        </div>
      )}
      {!query.isError && !rows.length && (
        <div className="rounded-2xl border border-dashed bg-card/60 p-4 text-sm text-muted-foreground">
          {tab === "incoming" ? copy.incomingRequests : copy.sentRequests}: 0
        </div>
      )}
      <div className="max-h-72 space-y-2 overflow-y-auto overscroll-contain pr-1" role="tabpanel">
        {rows.map(request => {
          const name = [request.otherUser.firstName, request.otherUser.lastName].filter(Boolean).join(" ") || copy.traveler;
          const when = formatConnectionTime(request.createdAt, language);
          const acceptPending = acceptRequest.isPending && acceptRequest.variables === request.otherUser.id;
          return (
            <article key={request.id} className="rounded-2xl border bg-card p-3" data-testid={`${tab}-request-card-${request.id}`}>
              <div className="flex items-center gap-3">
                {request.otherUser.profileImageUrl ? (
                  <img src={request.otherUser.profileImageUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-full bg-muted flex items-center justify-center">
                    <UserRound className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{name}</p>
                  <p className={`text-xs ${tab === "incoming" ? "text-sky-700 dark:text-sky-300" : "text-amber-700 dark:text-amber-300"}`}>
                    {tab === "incoming" ? copy.incomingRequests : copy.awaitingResponse}
                  </p>
                  {when && (
                    <time className="mt-1 block text-xs text-muted-foreground" dateTime={new Date(request.createdAt as string | Date).toISOString()} data-testid={`${tab}-request-timestamp-${request.id}`}>
                      {copy.requestDate} · {when}
                    </time>
                  )}
                </div>
                {tab === "incoming" && (
                  <Button
                    size="sm"
                    disabled={acceptRequest.isPending}
                    onClick={() => { setUnconfirmedId(null); acceptRequest.mutate(request.otherUser.id, {
                      onSuccess: result => {
                        if (result.isMatch) navigate(`/chat/${result.match.id}`);
                        else setUnconfirmedId(request.id);
                      },
                    }); }}
                    data-testid={`accept-request-${request.id}`}
                  >
                    {acceptPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ArrowUpRight className="mr-1 h-4 w-4" />}
                    {acceptPending ? copy.accepting : copy.accept}
                  </Button>
                )}
                <ConnectionSafetyActions
                  userId={request.otherUser.id}
                  userName={name}
                  testId={`request-${request.id}`}
                  onBlocked={() => {
                    if (unconfirmedId === request.id) setUnconfirmedId(null);
                    setBlockedUserIds(previous => previous.includes(request.otherUser.id) ? previous : [...previous, request.otherUser.id]);
                  }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
