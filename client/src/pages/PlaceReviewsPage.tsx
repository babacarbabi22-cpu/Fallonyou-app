import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, MapPin, Search, Star, ShieldCheck, Pencil, Trash2, Flag, Hotel, Compass, ChevronDown, RotateCcw, EyeOff, Check, X, MessageSquareText, Loader2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/hooks/use-danceme";
import { useToast } from "@/hooks/use-toast";
import { PLACE_REVIEW_COPY } from "@/shared/place-review-copy";
import type { PlaceReviewInput, PlaceReviewItem, PlaceReviewPage, PlaceReviewReport, PlaceReviewReportInput } from "@shared/place-reviews";

type ReviewKind = "hotel" | "place";
type ReportReason = PlaceReviewReportInput["reason"];
type Scope = "community" | "mine";
type PlaceReviewCopy = { [Key in keyof typeof PLACE_REVIEW_COPY.en]: string };

function responseJson<T>(method: string, url: string, body?: unknown): Promise<T> {
  return apiRequest(method, url, body).then((res) => res.json() as Promise<T>);
}

function errorCode(error: unknown) {
  const text = error instanceof Error ? error.message : "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return "";
  try { return JSON.parse(match[0]).error ?? ""; } catch { return ""; }
}

function Stars({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${label}: ${value} / 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} aria-hidden="true" className={`h-3.5 w-3.5 ${star <= Math.round(value) ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
      ))}
    </span>
  );
}

function RatingPicker({ value, onChange, label }: { value: number; onChange: (rating: number) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          role="radio"
          aria-checked={value === rating}
          aria-label={`${rating} / 5`}
          tabIndex={rating === (value || 1) ? 0 : -1}
          onClick={() => onChange(rating)}
          onKeyDown={(event) => {
            const next = event.key === "Home" ? 1 : event.key === "End" ? 5 :
              ["ArrowRight", "ArrowDown"].includes(event.key) ? rating % 5 + 1 :
              ["ArrowLeft", "ArrowUp"].includes(event.key) ? (rating + 3) % 5 + 1 : null;
            if (next === null) return;
            event.preventDefault();
            onChange(next);
            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next - 1]?.focus();
          }}
          className="rounded-lg p-1.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star className={`h-7 w-7 ${rating <= value ? "fill-primary text-primary" : "text-muted-foreground/35"}`} />
        </button>
      ))}
      <span className="ml-2 min-w-12 text-sm tabular-nums text-muted-foreground">{value}/5</span>
    </div>
  );
}

function ReviewCard({ review, copy, onEdit, onDelete, onReport, isAdmin, onModerate }: {
  review: PlaceReviewItem;
  copy: PlaceReviewCopy;
  onEdit: (review: PlaceReviewItem) => void;
  onDelete: (review: PlaceReviewItem) => void;
  onReport: (review: PlaceReviewItem) => void;
  isAdmin: boolean;
  onModerate: (review: PlaceReviewItem) => void;
}) {
  const locale = { en: "en-US", es: "es-ES", fr: "fr-FR", sv: "sv-SE" } as const;
  const { language } = useI18n();
  const date = new Date(review.updatedAt || review.createdAt);
  return (
    <article data-testid={`place-review-${review.id}`} className={`relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-5 ${review.hidden ? "border-destructive/40 opacity-90" : "border-border/70"}`}>
      <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-primary/[0.045]" aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
              {review.kind === "hotel" ? <Hotel className="h-3 w-3" /> : <Compass className="h-3 w-3" />}
              {review.kind === "hotel" ? copy.hotel : copy.place}
            </span>
            {review.isOwner && <span className="rounded-full border border-primary/30 px-2.5 py-1 text-[11px] font-medium text-primary">{copy.owner}</span>}
            {review.hidden && <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive">{copy.hidden}</span>}
          </div>
          <h2 className="break-words text-lg font-bold leading-tight">{review.placeName}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />{review.city}, {review.country}</p>
        </div>
        <div className="shrink-0 rounded-xl bg-primary/10 px-2.5 py-2 text-center">
          <span className="block font-display text-xl font-bold leading-none text-primary">{Number(review.averageRating || 0).toFixed(1)}</span>
          <span className="mt-1 block text-[9px] leading-tight text-muted-foreground">{copy.average}</span>
        </div>
      </div>
      <div className="relative mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars value={review.rating} label={copy.rating} />
        <span className="text-xs font-semibold tabular-nums">{review.rating}/5</span>
        <span className="text-[11px] text-muted-foreground">· {review.ratingCount} {copy.ratingCount}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{review.review}</p>
      <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.045] p-3.5">
        <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary"><MessageSquareText className="h-3.5 w-3.5" />{copy.recommendationLabel}</p>
        <p className="whitespace-pre-wrap text-sm leading-5 text-foreground/85">{review.recommendation || copy.noRecommendation}</p>
      </div>
      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <p className="text-[11px] text-muted-foreground">
          {copy.author} <span className="font-medium text-foreground/80">{review.authorName}</span>
          <span className="px-1">·</span>
          {copy.date} {date.toLocaleDateString(locale[language], { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <div className="flex items-center gap-1">
          {review.isOwner && (
            <>
              <Button data-testid={`edit-place-review-${review.id}`} variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={() => onEdit(review)}><Pencil className="h-3.5 w-3.5" />{copy.edit}</Button>
              <Button data-testid={`delete-place-review-${review.id}`} variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs text-destructive hover:text-destructive" onClick={() => onDelete(review)}><Trash2 className="h-3.5 w-3.5" />{copy.delete}</Button>
            </>
          )}
          {!review.isOwner && !isAdmin && (
            <Button data-testid={`report-place-review-${review.id}`} variant="ghost" size="sm" disabled={review.reportedByMe} className="h-8 gap-1.5 px-2 text-xs text-muted-foreground" onClick={() => onReport(review)}>
              <Flag className="h-3.5 w-3.5" />{review.reportedByMe ? copy.reported : copy.report}
            </Button>
          )}
          {isAdmin && <Button data-testid={`moderate-place-review-${review.id}`} variant="outline" size="sm" className="h-8 gap-1.5 px-2 text-xs" onClick={() => onModerate(review)}>{review.hidden ? <RotateCcw className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{review.hidden ? copy.restore : copy.hide}</Button>}
        </div>
      </div>
    </article>
  );
}

export default function PlaceReviewsPage() {
  const { language } = useI18n();
  const copy = PLACE_REVIEW_COPY[language] ?? PLACE_REVIEW_COPY.en;
  const { data: user } = useCurrentUser();
  const isAdmin = user?.isAdmin === "true";
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | ReviewKind>("all");
  const [scope, setScope] = useState<Scope>("community");
  const [cursor, setCursor] = useState<number | null>(null);
  const [reviews, setReviews] = useState<PlaceReviewItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PlaceReviewItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlaceReviewItem | null>(null);
  const [reportTarget, setReportTarget] = useState<PlaceReviewItem | null>(null);
  const [adminTab, setAdminTab] = useState<"community" | "reviews" | "reports">("community");
  const [reportCursor, setReportCursor] = useState<number | null>(null);
  const [reportRows, setReportRows] = useState<PlaceReviewReport[]>([]);

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    const q = search.trim();
    if (q) params.set("q", q);
    if (kind !== "all") params.set("kind", kind);
    params.set("scope", isAdmin && adminTab === "reviews" ? "moderation" : scope);
    if (cursor !== null) params.set("cursor", String(cursor));
    return `/api/place-reviews?${params.toString()}`;
  }, [search, kind, scope, cursor, isAdmin, adminTab]);
  const listQuery = useQuery<PlaceReviewPage>({
    queryKey: [queryUrl, user?.id],
    queryFn: () => responseJson("GET", queryUrl),
  });
  const reportUrl = `/api/place-reviews/reports${reportCursor !== null ? `?cursor=${reportCursor}` : ""}`;
  const reportsQuery = useQuery<{ reports: PlaceReviewReport[]; nextCursor: number | null }>({
    queryKey: [reportUrl, user?.id],
    queryFn: () => responseJson("GET", reportUrl),
    enabled: isAdmin && adminTab === "reports",
  });

  useEffect(() => {
    setCursor(null);
    setReviews([]);
  }, [search, kind, scope, adminTab, user?.id]);
  useEffect(() => {
    if (listQuery.data) {
      setReviews((previous) => cursor === null ? listQuery.data!.reviews : [...previous, ...listQuery.data!.reviews.filter((item) => !previous.some((old) => old.id === item.id))]);
    }
  }, [listQuery.data, listQuery.dataUpdatedAt, cursor]);
  useEffect(() => {
    if (reportsQuery.data) setReportRows((previous) => reportCursor === null ? reportsQuery.data!.reports : [...previous, ...reportsQuery.data!.reports.filter((item) => !previous.some((old) => old.id === item.id))]);
  }, [reportsQuery.data, reportsQuery.dataUpdatedAt, reportCursor]);
  useEffect(() => { setReportCursor(null); setReportRows([]); }, [adminTab, user?.id]);

  const refresh = () => {
    setCursor(null);
    setReviews([]);
    queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/place-reviews") });
  };
  const saveMutation = useMutation({
    mutationFn: (payload: PlaceReviewInput & { id?: number }) => {
      const { id, ...body } = payload;
      return responseJson<{ id: number }>(id ? "PATCH" : "POST", id ? `/api/place-reviews/${id}` : "/api/place-reviews", body);
    },
    onSuccess: (_data, variables) => {
      toast({ title: variables.id ? copy.saved : copy.created });
      setFormOpen(false);
      setEditing(null);
      refresh();
    },
    onError: (error) => {
      const code = errorCode(error);
      toast({ title: code === "duplicate_review" ? copy.duplicate : copy.genericError, variant: "destructive" });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => responseJson<{ success: true }>("DELETE", `/api/place-reviews/${id}`),
    onSuccess: () => { setDeleteTarget(null); toast({ title: copy.deleted }); refresh(); },
    onError: () => toast({ title: copy.genericError, variant: "destructive" }),
  });
  const reportMutation = useMutation({
    mutationFn: ({ id, ...body }: PlaceReviewReportInput & { id: number }) => responseJson<{ success: true }>("POST", `/api/place-reviews/${id}/report`, body),
    onSuccess: () => { setReportTarget(null); toast({ title: copy.reported, description: copy.reportedText }); refresh(); },
    onError: (error) => {
      const code = errorCode(error);
      toast({ title: code === "duplicate_report" ? copy.reported : copy.genericError, variant: "destructive" });
    },
  });
  const moderationMutation = useMutation({
    mutationFn: ({ id, hidden }: { id: number; hidden: boolean }) => responseJson<{ success: true }>("PATCH", `/api/place-reviews/${id}/moderation`, { hidden }),
    onSuccess: () => { refresh(); reportsQuery.refetch(); },
    onError: () => toast({ title: copy.moderationError, variant: "destructive" }),
  });
  const resolveMutation = useMutation({
    mutationFn: (id: number) => responseJson<{ success: true }>("PATCH", `/api/place-reviews/reports/${id}`, { resolved: true }),
    onSuccess: (_data, id) => {
      setReportRows((rows) => rows.filter((row) => row.id !== id));
      reportsQuery.refetch();
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("/api/place-reviews/reports") });
    },
    onError: () => toast({ title: copy.moderationError, variant: "destructive" }),
  });

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(review: PlaceReviewItem) {
    setEditing(review);
    setFormOpen(true);
  }

  return (
    <main className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-xl"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}>
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link href="/tips" aria-label={copy.close} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{copy.eyebrow}</p>
            <h1 className="text-base leading-tight">{copy.title}</h1>
          </div>
          <Button data-testid="button-new-place-review" size="sm" onClick={openCreate} className="shrink-0 rounded-full px-3 text-xs sm:px-4"><Pencil className="mr-1.5 h-3.5 w-3.5" />{copy.addReview}</Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-8 pt-5 sm:px-6 sm:pt-8">
        <section className="relative overflow-hidden rounded-[1.65rem] border border-primary/20 bg-card px-5 py-6 shadow-sm sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border border-primary/10" />
          <div className="pointer-events-none absolute -right-1 top-0 h-36 w-36 rounded-full border border-primary/10" />
          <div className="relative max-w-2xl">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></div>
            <h2 className="max-w-xl font-display text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl">{copy.title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">{copy.intro}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <div className="flex gap-2.5 rounded-xl bg-primary/[0.07] p-3 text-xs leading-5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{copy.memberNote}</span>
              </div>
              <div className="flex gap-2.5 rounded-xl bg-muted/70 p-3 text-xs leading-5 text-muted-foreground">
                <EyeOff className="mt-0.5 h-4 w-4 shrink-0" /><span>{copy.privacy}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-border/70 bg-card/70 p-3.5 sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.searchPlaceholder} aria-label={copy.search} className="h-11 rounded-xl border-border/60 bg-background pl-9" />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-full bg-muted/80 p-1" role="tablist" aria-label={copy.all}>
              {(["community", "mine"] as Scope[]).map((value) => (
                <button key={value} data-testid={`reviews-scope-${value}`} role="tab"
                  aria-selected={scope === value && (!isAdmin || adminTab === "community")}
                  onClick={() => { setScope(value); setAdminTab("community"); }}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${scope === value && (!isAdmin || adminTab === "community") ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{value === "community" ? copy.all : copy.mine}</button>
              ))}
            </div>
            <Select value={kind} onValueChange={(value: "all" | ReviewKind) => setKind(value)}>
              <SelectTrigger className="h-10 w-[145px] rounded-full bg-background text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.allKinds}</SelectItem>
                <SelectItem value="hotel">{copy.hotels}</SelectItem>
                <SelectItem value="place">{copy.places}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {isAdmin && (
          <section className="mt-4 rounded-2xl border border-primary/25 bg-primary/[0.035] p-3.5 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{copy.admin}</p><p className="mt-1 text-xs text-muted-foreground">{copy.moderation}</p></div>
              <div className="flex rounded-full border border-border bg-background p-1">
                <button data-testid="reviews-moderation" onClick={() => setAdminTab("reviews")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${adminTab === "reviews" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{copy.moderation}</button>
                <button data-testid="reviews-reports" onClick={() => setAdminTab("reports")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${adminTab === "reports" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{copy.reports}{reportRows.length > 0 ? ` · ${reportRows.length}` : ""}</button>
              </div>
            </div>
          </section>
        )}

        {isAdmin && adminTab === "reports" ? (
          <section className="mt-5 space-y-3">
            {reportsQuery.isLoading && <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">{copy.loadingReports}</div>}
            {reportsQuery.isError && <ErrorPanel copy={copy} onRetry={() => reportsQuery.refetch()} />}
            {!reportsQuery.isLoading && !reportsQuery.isError && reportRows.length === 0 && <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center"><Check className="mx-auto h-7 w-7 text-primary" /><h2 className="mt-3 text-lg">{copy.noReports}</h2></div>}
            {reportRows.map((report) => <ReportCard key={report.id} report={report} copy={copy} onDismiss={() => resolveMutation.mutate(report.id)} onHide={() => moderationMutation.mutate({ id: report.review.id, hidden: true })} busy={resolveMutation.isPending || moderationMutation.isPending} />)}
            {reportsQuery.data?.nextCursor !== null && reportsQuery.data?.nextCursor !== undefined && <Button variant="outline" className="w-full" onClick={() => setReportCursor(reportsQuery.data!.nextCursor)}><ChevronDown className="mr-2 h-4 w-4" />{copy.next}</Button>}
          </section>
        ) : (
          <section className="mt-5 space-y-3">
            {listQuery.isLoading && reviews.length === 0 && <LoadingState copy={copy} />}
            {listQuery.isError && <ErrorPanel copy={copy} onRetry={() => listQuery.refetch()} />}
            {!listQuery.isLoading && !listQuery.isError && reviews.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-card/55 px-6 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Compass className="h-5 w-5" /></div>
                <h2 className="mt-4 text-lg">{search || scope === "mine" ? copy.noResults : copy.emptyTitle}</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{search || scope === "mine" ? "" : copy.emptyText}</p>
                {!search && scope === "community" && <Button className="mt-5 rounded-full" onClick={openCreate}>{copy.addReview}</Button>}
              </div>
            )}
            {reviews.map((review) => <ReviewCard key={review.id} review={review} copy={copy} onEdit={openEdit} onDelete={setDeleteTarget} onReport={setReportTarget} isAdmin={isAdmin} onModerate={(item) => moderationMutation.mutate({ id: item.id, hidden: !item.hidden })} />)}
            {listQuery.data?.nextCursor !== null && listQuery.data?.nextCursor !== undefined && (
              <Button variant="outline" className="w-full rounded-xl" disabled={listQuery.isFetching} onClick={() => setCursor(listQuery.data!.nextCursor)}>
                {listQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronDown className="mr-2 h-4 w-4" />}{copy.next}
              </Button>
            )}
          </section>
        )}
        <p className="mx-auto mt-5 max-w-2xl text-center text-[11px] leading-5 text-muted-foreground">{copy.sourceNote}</p>
      </div>
      <BottomNav />

      <ReviewFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        copy={copy}
        isSaving={saveMutation.isPending}
        onSubmit={(input) => saveMutation.mutate({ ...input, ...(editing ? { id: editing.id } : {}) })}
      />
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>{copy.deleteTitle}</DialogTitle><DialogDescription>{copy.deleteText}</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{copy.cancel}</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}><Trash2 className="mr-2 h-4 w-4" />{copy.confirmDelete}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ReportDialog open={!!reportTarget} onOpenChange={(open) => !open && setReportTarget(null)} copy={copy} isPending={reportMutation.isPending} onSubmit={(payload) => reportTarget && reportMutation.mutate({ id: reportTarget.id, ...payload })} />
    </main>
  );
}

function LoadingState({ copy }: { copy: PlaceReviewCopy }) {
  return <div aria-label={copy.loading} className="space-y-3">
    <div className="rounded-2xl border bg-card p-5"><div className="h-4 w-24 animate-pulse rounded bg-muted" /><div className="mt-4 h-6 w-2/3 animate-pulse rounded bg-muted" /><div className="mt-4 h-4 w-full animate-pulse rounded bg-muted" /><div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-muted" /><div className="mt-5 h-20 animate-pulse rounded-xl bg-muted/70" /></div>
    <div className="rounded-2xl border bg-card p-5"><div className="h-4 w-28 animate-pulse rounded bg-muted" /><div className="mt-4 h-6 w-1/2 animate-pulse rounded bg-muted" /><div className="mt-4 h-16 animate-pulse rounded-xl bg-muted/70" /></div>
    <span className="sr-only">{copy.loading}</span>
  </div>;
}

function ErrorPanel({ copy, onRetry }: { copy: PlaceReviewCopy; onRetry: () => void }) {
  return <div role="alert" className="rounded-2xl border border-destructive/25 bg-destructive/[0.045] px-6 py-8 text-center">
    <p className="font-semibold">{copy.errorTitle}</p><p className="mt-1 text-sm text-muted-foreground">{copy.errorText}</p>
    <Button variant="outline" className="mt-4" onClick={onRetry}><RotateCcw className="mr-2 h-4 w-4" />{copy.retry}</Button>
  </div>;
}

function ReviewFormDialog({ open, onOpenChange, editing, copy, isSaving, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PlaceReviewItem | null;
  copy: PlaceReviewCopy;
  isSaving: boolean;
  onSubmit: (input: PlaceReviewInput) => void;
}) {
  const [kind, setKind] = useState<ReviewKind>("hotel");
  const [placeName, setPlaceName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [showConfirmError, setShowConfirmError] = useState(false);
  useEffect(() => {
    if (open) {
      setKind(editing?.kind ?? "hotel");
      setPlaceName(editing?.placeName ?? "");
      setCity(editing?.city ?? "");
      setCountry(editing?.country ?? "");
      setRating(editing?.rating ?? 0);
      setReview(editing?.review ?? "");
      setRecommendation(editing?.recommendation ?? "");
      setConfirmed(false);
      setShowConfirmError(false);
    }
  }, [open, editing]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!confirmed) { setShowConfirmError(true); return; }
    onSubmit({ kind, placeName, city, country, rating, review, recommendation, pastVisitConfirmed: true });
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="place-review-form" className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{copy.formTitle}</DialogTitle>
          <DialogDescription>{copy.memberNote}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <Field label={copy.placeName}><Input aria-label={copy.placeName} data-testid="review-place-name" required minLength={2} maxLength={120} value={placeName} onChange={(e) => setPlaceName(e.target.value)} /></Field>
            <Field label={copy.kind}>
              <Select value={kind} onValueChange={(value) => setKind(value as ReviewKind)}>
                <SelectTrigger aria-label={copy.kind}><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="hotel">{copy.hotel}</SelectItem><SelectItem value="place">{copy.place}</SelectItem></SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={copy.city}><Input aria-label={copy.city} data-testid="review-city" required minLength={2} maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} /></Field>
            <Field label={copy.country}><Input aria-label={copy.country} data-testid="review-country" required minLength={2} maxLength={80} value={country} onChange={(e) => setCountry(e.target.value)} /></Field>
          </div>
          <Field label={copy.rating}><RatingPicker value={rating} onChange={setRating} label={copy.rating} /></Field>
          <Field label={copy.review}><Textarea aria-label={copy.review} data-testid="review-text" required minLength={10} maxLength={1500} rows={4} value={review} onChange={(e) => setReview(e.target.value)} placeholder={copy.reviewPlaceholder} /><span className="text-right text-[10px] text-muted-foreground">{review.length}/1500</span></Field>
          <Field label={copy.recommendation}><Textarea aria-label={copy.recommendation} data-testid="review-recommendation" maxLength={500} rows={2} value={recommendation} onChange={(e) => setRecommendation(e.target.value)} placeholder={copy.recommendationPlaceholder} /></Field>
          <div className="rounded-xl border border-primary/20 bg-primary/[0.045] p-3.5">
            <div className="flex items-start gap-3">
              <Checkbox id="past-visit-confirmation" checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} className="mt-0.5" />
              <label htmlFor="past-visit-confirmation" className="cursor-pointer text-xs leading-5">{copy.visitConfirm}</label>
            </div>
            {showConfirmError && !confirmed && <p className="mt-2 text-xs text-destructive">{copy.pastVisitRequired}</p>}
          </div>
          <p className="text-[11px] leading-5 text-muted-foreground">{copy.privacy}</p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{copy.cancel}</Button>
            <Button data-testid="submit-place-review" type="submit" disabled={isSaving || rating < 1} className="min-w-36">{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? copy.update : copy.save}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-xs font-semibold">{label}{children}</label>;
}

function ReportDialog({ open, onOpenChange, copy, isPending, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: PlaceReviewCopy;
  isPending: boolean;
  onSubmit: (payload: PlaceReviewReportInput) => void;
}) {
  const [reason, setReason] = useState<ReportReason>("privacy");
  const [details, setDetails] = useState("");
  useEffect(() => { if (open) { setReason("privacy"); setDetails(""); } }, [open]);
  const reasonLabels: Record<ReportReason, string> = { privacy: copy.privacyReason, spam: copy.spamReason, misleading: copy.misleadingReason, other: copy.otherReason };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="rounded-2xl sm:max-w-md">
      <DialogHeader><DialogTitle>{copy.reportTitle}</DialogTitle><DialogDescription>{copy.reportText}</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <Field label={copy.reason}><Select value={reason} onValueChange={(value) => setReason(value as ReportReason)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(reasonLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></Field>
        <Field label={copy.details}><Textarea maxLength={500} rows={3} value={details} onChange={(e) => setDetails(e.target.value)} /></Field>
      </div>
      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>{copy.cancel}</Button>
        <Button disabled={isPending} onClick={() => onSubmit({ reason, details })}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{copy.submitReport}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

function ReportCard({ report, copy, onDismiss, onHide, busy }: {
  report: PlaceReviewReport;
  copy: PlaceReviewCopy;
  onDismiss: () => void;
  onHide: () => void;
  busy: boolean;
}) {
  const reasonCopy: Record<ReportReason, string> = { privacy: copy.privacyReason, spam: copy.spamReason, misleading: copy.misleadingReason, other: copy.otherReason };
  return <article className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><p className="text-xs font-bold text-destructive">{reasonCopy[report.reason]}</p><p className="mt-1 text-[11px] text-muted-foreground">{new Date(report.createdAt).toLocaleString()}</p></div>
      <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold">{report.review.authorName}</span>
    </div>
    {report.details && <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">{report.details}</p>}
    <div className="mt-3 rounded-xl border border-border/60 p-3">
      <p className="font-semibold">{report.review.placeName} · {report.review.city}, {report.review.country}</p>
      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{report.review.review}</p>
    </div>
    <div className="mt-3 flex flex-wrap justify-end gap-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={onDismiss}><X className="mr-1.5 h-3.5 w-3.5" />{copy.dismiss}</Button>
      <Button variant="destructive" size="sm" disabled={busy} onClick={onHide}><EyeOff className="mr-1.5 h-3.5 w-3.5" />{copy.hide}</Button>
    </div>
  </article>;
}
