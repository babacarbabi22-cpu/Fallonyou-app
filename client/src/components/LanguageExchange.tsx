import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowUpRight, Check, Clock3, Languages, MapPin, MessageCircle, RotateCw, Save, UserRound, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Language } from "@/lib/i18n";
import { exchangeCopy, exchangeLanguages } from "@/components/language-exchange-copy";

type Helper = {
  id: string;
  firstName: string;
  profileImageUrl: string | null;
  offeredLanguages: string[];
  learningLanguages: string[] | null;
  city: string | null;
  bio: string | null;
  matchId: number | null;
};
type ExchangeRequest = {
  id: number;
  fromUserId: string;
  toUserId: string;
  language: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  matchId: number | null;
  createdAt: string;
  otherUser: { id: string; firstName: string; profileImageUrl: string | null };
};
type RequestLists = { incoming: ExchangeRequest[]; outgoing: ExchangeRequest[] };
type Preferences = { offeredLanguages: string[] };

async function getJson<T>(url: string): Promise<T> {
  const response = await apiRequest("GET", url);
  return response.json() as Promise<T>;
}

export default function LanguageExchange({ selectedLang, language }: { selectedLang: string; language: Language }) {
  const copy = exchangeCopy[language] ?? exchangeCopy.en;
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [offered, setOffered] = useState<string[]>([]);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionFeedback, setActionFeedback] = useState("");

  const preferencesQuery = useQuery<Preferences>({
    queryKey: ["/api/language/exchange/preferences"],
    queryFn: () => getJson("/api/language/exchange/preferences"),
    staleTime: 0,
  });
  useEffect(() => {
    if (preferencesQuery.data && !preferencesLoaded) {
      setOffered(preferencesQuery.data.offeredLanguages);
      setPreferencesLoaded(true);
    }
  }, [preferencesQuery.data, preferencesLoaded]);

  const helpersQuery = useQuery<Helper[]>({
    queryKey: ["/api/language/exchange/helpers", selectedLang],
    queryFn: () => getJson(`/api/language/exchange/helpers?lang=${encodeURIComponent(selectedLang)}`),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const requestsQuery = useQuery<RequestLists>({
    queryKey: ["/api/language/exchange/requests"],
    queryFn: () => getJson("/api/language/exchange/requests"),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const invalidateExchange = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["/api/language/exchange/helpers"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/language/exchange/requests"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/matches"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/matches/requests"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/my-connected-cities"] }),
  ]);
  const savePreferences = useMutation({
    mutationFn: (offeredLanguages: string[]) =>
      apiRequest("PATCH", "/api/language/exchange/preferences", { offeredLanguages }),
    onSuccess: () => {
      setFeedback(copy.saved);
      setPreferencesLoaded(true);
      void queryClient.invalidateQueries({ queryKey: ["/api/language/exchange/preferences"] });
    },
    onError: error => setFeedback(errorText(error, copy)),
  });
  const createRequest = useMutation({
    mutationFn: ({ toUserId, lang }: { toUserId: string; lang: string }) =>
      apiRequest("POST", "/api/language/exchange/requests", { toUserId, language: lang }),
    onSuccess: async response => {
      const result = await response.json() as ExchangeRequest;
      setActionError("");
      setActionFeedback(result.status === "accepted" ? copy.accepted : copy.pendingFeedback);
      void invalidateExchange();
    },
    onError: error => { setActionFeedback(""); setActionError(errorText(error, copy)); },
  });
  const updateRequest = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "accept" | "decline" | "cancel" }) =>
      apiRequest("PATCH", `/api/language/exchange/requests/${id}`, { action }),
    onSuccess: async (response, variables) => {
      setActionError("");
      setActionFeedback("");
      const result = await response.json() as ExchangeRequest;
      await invalidateExchange();
      if (variables.action === "accept" && result.matchId != null) navigate(`/chat/${result.matchId}`);
    },
    onError: error => { setActionFeedback(""); setActionError(errorText(error, copy)); },
  });

  const incoming = requestsQuery.data?.incoming ?? [];
  const outgoing = requestsQuery.data?.outgoing ?? [];
  const resolved = [...incoming, ...outgoing].filter(item => item.status !== "pending");
  const pendingOutgoingIds = useMemo(
    () => new Set(outgoing.filter(item => item.status === "pending").map(item => item.toUserId)),
    [outgoing],
  );
  const activeHelpers = helpersQuery.data ?? [];
  const requestsLoading = requestsQuery.isLoading;
  const busy = savePreferences.isPending || preferencesQuery.isLoading || (!preferencesLoaded && preferencesQuery.isError);
  const selectedLabel = exchangeLanguages.find(item => item.code === selectedLang)?.label ?? selectedLang;
  const languageLabel = (code: string) => exchangeLanguages.find(item => item.code === code)?.label ?? code;

  function toggleOffered(code: string) {
    setOffered(current => current.includes(code) ? current.filter(item => item !== code) : [...current, code]);
    setFeedback("");
  }

  const preferenceError = preferencesQuery.isError && !preferencesLoaded;
  const exchangeLoadError = (helpersQuery.isError && !helpersQuery.data) || (requestsQuery.isError && !requestsQuery.data);
  const exchangeError = helpersQuery.isError ? helpersQuery.error : requestsQuery.error;
  const helperLoading = helpersQuery.isLoading || helpersQuery.data === undefined;

  return (
    <section className="px-4 pt-4 pb-8 space-y-5" aria-label={copy.title}>
      <header className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-rose-500/5 p-5">
        <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full border-[24px] border-amber-500/10" aria-hidden="true" />
        <div className="relative flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700">
            <Languages className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">{copy.title}</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-foreground/80">{copy.intro}</p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border bg-card p-4 shadow-sm" aria-labelledby="exchange-offer-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="exchange-offer-title" className="font-semibold">{copy.offerTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.offerHelp}</p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{copy.independent}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {exchangeLanguages.map(item => {
            const chosen = offered.includes(item.code);
            return (
              <button
                key={item.code}
                type="button"
                disabled={busy || savePreferences.isPending}
                aria-pressed={chosen}
                onClick={() => toggleOffered(item.code)}
                className={`min-h-10 rounded-xl border px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  chosen ? "border-amber-500 bg-amber-500 text-white" : "border-border bg-background hover:border-amber-500/60"
                }`}
              >
                {chosen && <Check className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />}
                {item.label}
              </button>
            );
          })}
          {offered.length > 0 && (
            <button type="button" disabled={busy || savePreferences.isPending} onClick={() => { setOffered([]); setFeedback(""); }}
              className="min-h-10 rounded-xl px-3 text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50">
              {language === "es" ? "Quitar todos" : language === "fr" ? "Tout retirer" : language === "sv" ? "Rensa alla" : "Clear all"}
            </button>
          )}
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">{copy.offerHint}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy || savePreferences.isPending || preferenceError}
            onClick={() => { setFeedback(""); savePreferences.mutate(offered); }}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50">
            <Save className="h-4 w-4" aria-hidden="true" />{copy.save}
          </button>
          {feedback && <p role="status" className={`text-sm ${feedback === copy.saved ? "text-emerald-700" : "text-destructive"}`}>{feedback}</p>}
          {preferenceError && <div className="flex items-center gap-2 text-sm text-destructive">
            <span>{copy.loadError} {errorText(preferencesQuery.error, copy)}</span>
            <button type="button" className="underline" onClick={() => void preferencesQuery.refetch()}>{copy.retry}</button>
          </div>}
        </div>
      </section>

      {(incoming.some(item => item.status === "pending") || outgoing.some(item => item.status === "pending")) && (
        <div className="grid gap-4 md:grid-cols-2">
          <RequestPanel title={copy.incoming} hint={copy.incomingHint} empty={copy.noIncoming} requests={incoming.filter(item => item.status === "pending")}
            copy={copy} languageLabel={languageLabel} busy={updateRequest.isPending} onAction={(id, action) => updateRequest.mutate({ id, action })}
            onChat={id => navigate(`/chat/${id}`)} />
          <RequestPanel title={copy.outgoing} hint={copy.outgoingHint} empty={copy.noOutgoing} requests={outgoing.filter(item => item.status === "pending")}
            copy={copy} languageLabel={languageLabel} busy={updateRequest.isPending} onAction={(id, action) => updateRequest.mutate({ id, action })}
            onChat={id => navigate(`/chat/${id}`)} outgoing />
        </div>
      )}

      {resolved.length > 0 && (
        <RequestPanel title={copy.history} hint={copy.historyHint} empty="" requests={resolved}
          copy={copy} languageLabel={languageLabel} busy={updateRequest.isPending}
          onAction={(id, action) => updateRequest.mutate({ id, action })} onChat={id => navigate(`/chat/${id}`)} />
      )}

      {actionError && <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        <span>{actionError}</span><button type="button" aria-label={copy.dismiss} onClick={() => setActionError("")}><X className="h-4 w-4" /></button>
      </div>}
      {actionFeedback && <p role="status" className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-sm text-amber-800">{actionFeedback}</p>}
      {!exchangeLoadError && (helpersQuery.isError || requestsQuery.isError) && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
          <span>{errorText(exchangeError, copy)}</span>
          <button type="button" className="min-h-9 underline underline-offset-4" onClick={() => { void helpersQuery.refetch(); void requestsQuery.refetch(); }}>{copy.retry}</button>
        </div>
      )}

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">{copy.findTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{copy.findHint}</p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium">{selectedLabel}</span>
      </div>

      {exchangeLoadError ? (
        <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/5 p-5 text-center">
          <p className="text-sm text-destructive">{copy.loadError} {errorText(exchangeError, copy)}</p>
          <button type="button" onClick={() => { void helpersQuery.refetch(); void requestsQuery.refetch(); }}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium hover:bg-muted">
            <RotateCw className="h-4 w-4" aria-hidden="true" />{copy.retry}
          </button>
        </div>
      ) : helperLoading || requestsLoading ? (
        <div className="space-y-3" aria-label={copy.loading}>
          {[0, 1, 2].map(item => <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : activeHelpers.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 px-5 py-10 text-center">
          <UserRound className="mx-auto h-8 w-8 text-muted-foreground/70" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">{copy.noHelpers}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeHelpers.map(person => {
            const alreadyRequested = pendingOutgoingIds.has(person.id);
            return (
              <article key={person.id} className="rounded-2xl border bg-card p-4 transition-colors hover:border-amber-500/35">
                <div className="flex items-start gap-3">
                  <Avatar name={person.firstName} image={person.profileImageUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="font-semibold">{person.firstName}</h3>
                      {person.city && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" aria-hidden="true" />{person.city}</span>}
                    </div>
                    {person.bio && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{person.bio}</p>}
                    <LanguagePills label={copy.help} codes={person.offeredLanguages} languageLabel={languageLabel} />
                    {!!person.learningLanguages?.length && <LanguagePills label={copy.learning} codes={person.learningLanguages} languageLabel={languageLabel} subdued />}
                    <div className="mt-3">
                      {person.matchId != null ? (
                        <button type="button" onClick={() => navigate(`/chat/${person.matchId}`)}
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-500 px-3.5 text-sm font-semibold text-white hover:bg-amber-600">
                          <MessageCircle className="h-4 w-4" aria-hidden="true" />{copy.chat}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      ) : alreadyRequested ? (
                        <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-500/10 px-3.5 text-sm font-medium text-amber-800" aria-label={copy.pending}>
                          <Clock3 className="h-4 w-4" aria-hidden="true" />{copy.pending}
                        </span>
                      ) : (
                        <button type="button" disabled={createRequest.isPending} onClick={() => createRequest.mutate({ toUserId: person.id, lang: selectedLang })}
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-500/50 px-3.5 text-sm font-semibold text-amber-800 hover:bg-amber-500/10 disabled:opacity-50">
                          <MessageCircle className="h-4 w-4" aria-hidden="true" />{copy.request}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  return image
    ? <img src={image} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-background" />
    : <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/15 font-semibold text-amber-800">{name?.slice(0, 1) || "?"}</div>;
}

function LanguagePills({ label, codes, languageLabel, subdued = false }: { label: string; codes: string[]; languageLabel: (code: string) => string; subdued?: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-[11px] text-muted-foreground">{label}:</span>
      {codes.map(code => <span key={code} className={`rounded-full px-2 py-0.5 text-[11px] ${subdued ? "bg-muted text-muted-foreground" : "bg-amber-500/10 text-amber-800"}`}>{languageLabel(code)}</span>)}
    </div>
  );
}

function RequestPanel({ title, hint, empty, requests, copy, languageLabel, busy, onAction, onChat, outgoing = false }: {
  title: string; hint: string; empty: string; requests: ExchangeRequest[]; copy: typeof exchangeCopy.en;
  languageLabel: (code: string) => string; busy: boolean;
  onAction: (id: number, action: "accept" | "decline" | "cancel") => void;
  onChat: (matchId: number) => void; outgoing?: boolean;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4" aria-label={title}>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
      {requests.length === 0 ? <p className="mt-4 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">{empty}</p> : (
        <div className="mt-3 space-y-3">
          {requests.map(request => <div key={request.id} className="rounded-xl border bg-background p-3">
            <div className="flex items-center gap-2.5">
              <Avatar name={request.otherUser.firstName} image={request.otherUser.profileImageUrl} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{request.otherUser.firstName}</p>
                <p className="text-xs text-muted-foreground">{languageLabel(request.language)}</p>
              </div>
            </div>
            {request.status !== "pending" ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {request.status === "accepted" ? copy.accepted : request.status === "declined" ? copy.declined : copy.cancelled}
                </p>
                {request.status === "accepted" && request.matchId != null ? (
                  <button type="button" onClick={() => onChat(request.matchId!)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-amber-500 px-3 text-sm font-semibold text-white hover:bg-amber-600">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />{copy.chat}
                  </button>
                ) : request.status === "accepted" ? <p className="text-xs text-muted-foreground">{copy.closed}</p> : null}
              </div>
            ) : outgoing ? (
              <button type="button" disabled={busy} onClick={() => onAction(request.id, "cancel")}
                className="mt-3 min-h-10 w-full rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50">{copy.cancel}</button>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} onClick={() => onAction(request.id, "accept")}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                  <Check className="h-4 w-4" aria-hidden="true" />{copy.accept}
                </button>
                <button type="button" disabled={busy} onClick={() => onAction(request.id, "decline")}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2 text-sm font-medium hover:bg-muted disabled:opacity-50">
                  <X className="h-4 w-4" aria-hidden="true" />{copy.decline}
                </button>
              </div>
            )}
            {request.status === "accepted" && request.matchId != null && (
              <button type="button" className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-amber-800" onClick={() => onChat(request.matchId!)}>
                <MessageCircle className="h-4 w-4" aria-hidden="true" />{copy.chat}
              </button>
            )}
          </div>)}
        </div>
      )}
    </section>
  );
}

function errorText(error: unknown, copy: typeof exchangeCopy.en): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("closed_connection")) return copy.closed;
  if (message.includes("request_limit") || message.startsWith("429")) return copy.limited;
  if (message.startsWith("401")) return copy.unauthenticated;
  if (message.startsWith("403")) return copy.forbidden;
  return message ? `${copy.genericError} (${message.replace(/^\d+:\s*/, "").slice(0, 180)})` : copy.genericError;
}
