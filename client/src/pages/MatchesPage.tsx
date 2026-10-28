import { useMatches, useCurrentUser } from "@/hooks/use-danceme";
import { BottomNav } from "@/components/BottomNav";
import { MatchRatingModal } from "@/components/MatchRatingModal";
import { LocalHelpPanel } from "@/pages/LocalHelpPage";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, MessageCircle, Star, Shield, Camera, ArrowRight, CalendarDays, Users, Sparkles, MapPin, Plane, Store, Tag, ExternalLink, HandHeart, Euro } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n, useTranslation } from "@/lib/i18n";
import { hasProfilePhoto } from "@/lib/profile-photo";
import { MATCHES_PAGE_LOCALE_COPY } from "./matchesPageLocaleCopy";
import { SentConnectionRequests } from "@/components/SentConnectionRequests";
import { connectionCopy } from "@/lib/connection-copy";
import { queryClient } from "@/lib/queryClient";
import { formatConnectionTime, sortConnectionsNewestFirst } from "@shared/connection-time";
import { ConnectionSafetyActions } from "@/components/ConnectionSafetyActions";

// ── Recommendation cards shown between matches ──────────────────────────────
const RECO_CARDS = [
  {
    key: "local",
    icon: Store,
    href: "/premium",
    style: { background: "linear-gradient(135deg,rgba(47,111,137,0.11),rgba(47,111,137,0.03))", border: "1px solid rgba(47,111,137,0.24)" },
    ctaStyle: { color: "#2F6F89" },
  },
  {
    key: "plan",
    icon: CalendarDays,
    href: "/events",
    style: { background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)" },
    ctaStyle: { color: "#6366f1" },
  },
  {
    key: "partner",
    icon: Tag,
    href: "mailto:fallonyouapp@hotmail.com",
    style: { background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.18)" },
    ctaStyle: { color: "#16a34a" },
  },
];

function RecommendationCard({ index }: { index: number }) {
  const card = RECO_CARDS[index % RECO_CARDS.length];
  const Icon = card.icon;
  const isExternal = card.href.startsWith("mailto");
  const { language } = useI18n();
  const cardCopy = MATCHES_PAGE_LOCALE_COPY[language].recommendations[card.key as "local" | "plan" | "partner"];
  const href = isExternal
    ? `${card.href}?subject=${encodeURIComponent(cardCopy.mailSubject ?? "")}`
    : card.href;
  return (
    <a
      href={isExternal ? href : undefined}
      onClick={!isExternal ? (e) => { e.preventDefault(); window.location.href = href; } : undefined}
      className="block rounded-2xl p-4 transition-opacity hover:opacity-90 cursor-pointer"
      style={card.style}
      data-testid={`reco-card-${card.key}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/60 dark:bg-white/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-[#2F6F89] dark:text-sky-300" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-muted-foreground">{cardCopy.badge}</span>
          <p className="text-sm font-bold text-foreground leading-snug mt-0.5">{cardCopy.title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{cardCopy.description}</p>
          <p className="text-xs font-semibold mt-2 flex items-center gap-1" style={card.ctaStyle}>
            {cardCopy.cta} <ExternalLink className="w-3 h-3" />
          </p>
        </div>
      </div>
    </a>
  );
}

// ── Engagement cards shown below the matches list ──────────────────────────
function EngagementCards({ matchCount }: { matchCount: number }) {
  const [, navigate] = useLocation();
  const t = useTranslation();
  const { language } = useI18n();
  const copy = MATCHES_PAGE_LOCALE_COPY[language].engagement;
  return (
    <div className="space-y-3 mt-5">

      {/* Create a plan card */}
      <div
        className="rounded-2xl overflow-hidden cursor-pointer group"
        style={{
          background: "linear-gradient(135deg,#214f63 0%,#2F6F89 55%,#4389a4 100%)",
          boxShadow: "0 4px 20px rgba(47,111,137,0.28)",
        }}
        onClick={() => navigate("/events")}
        data-testid="card-create-plan"
      >
        <div className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base leading-tight">
              {matchCount > 0 ? copy.createPlanWithConnections : copy.createPlanFirst}
            </p>
            <p className="text-white/70 text-xs mt-0.5 leading-snug">
              {matchCount > 0 ? copy.planDescriptionWithConnections : copy.planDescriptionFirst}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition-colors">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Discover more card */}
      <div
        className="rounded-2xl border cursor-pointer group bg-card hover:bg-accent/30 transition-colors"
        style={{ borderColor: "rgba(47,111,137,0.22)" }}
        onClick={() => navigate("/")}
        data-testid="card-discover-more"
      >
        <div className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-600/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-[#2F6F89] dark:text-sky-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base text-foreground leading-tight">{t.ui.matchesDiscoverMore}</p>
            <p className="text-muted-foreground text-xs mt-0.5 leading-snug">
              {t.ui.matchesDiscoverMoreDesc}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-sky-600/10 transition-colors">
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[#2F6F89] dark:group-hover:text-sky-300 transition-colors" />
          </div>
        </div>
      </div>

      {/* Community vibe card */}
      <div
        className="rounded-2xl p-4 text-center"
        style={{
          background: "rgba(47,111,137,0.06)",
          border: "1px solid rgba(47,111,137,0.16)",
        }}
        data-testid="card-community-tip"
      >
        <div className="flex justify-center gap-1 mb-2">
          {["🌍","✈️","🏖️","🎉","🤝"].map((e, i) => (
            <span key={i} className="text-lg">{e}</span>
          ))}
        </div>
        <p className="text-sm font-semibold text-foreground">
          {t.ui.matchesCommunityTitle}
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {t.ui.matchesCommunityDesc}
        </p>
      </div>
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────
function EmptyState() {
  const [, navigate] = useLocation();
  const t = useTranslation();
  return (
    <div className="py-8 space-y-4">
      {/* Hero empty card */}
      <div className="text-center py-8 px-4">
        <div
          className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,rgba(47,111,137,0.15),rgba(47,111,137,0.05))", border: "2px dashed rgba(47,111,137,0.32)" }}
        >
          <Users className="w-9 h-9 text-[#2F6F89]/70 dark:text-sky-300" />
        </div>
        <h3 className="text-xl font-bold mb-1">{t.ui.matchesEmptyTitle}</h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          {t.ui.matchesEmptyDesc}
        </p>
        <Button
          className="mt-4 bg-[#2F6F89] hover:bg-[#245A70] text-white font-bold rounded-xl px-6"
          onClick={() => navigate("/")}
          data-testid="button-go-discover"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {t.nav.discover}
        </Button>
      </div>

      {/* Divider with text */}
      <div className="flex items-center gap-3 px-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium">{t.ui.matchesWhile}</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Start with events */}
      <div
        className="rounded-2xl overflow-hidden cursor-pointer group"
        style={{
          background: "linear-gradient(135deg,#214f63 0%,#2F6F89 55%,#4389a4 100%)",
          boxShadow: "0 4px 20px rgba(47,111,137,0.28)",
        }}
        onClick={() => navigate("/events")}
        data-testid="card-empty-create-plan"
      >
        <div className="p-5 text-center">
          <CalendarDays className="w-8 h-8 text-white/80 mx-auto mb-2" />
           <p className="text-white font-bold text-base">{t.ui.matchesCreatePlan}</p>
          <p className="text-white/65 text-xs mt-1 leading-relaxed">
             {t.ui.matchesCreatePlanDesc}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 rounded-full px-4 py-1.5 text-white text-xs font-semibold">
             {t.ui.matchesViewPlans} <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Community tip */}
      <div
        className="rounded-2xl p-4 flex gap-3 items-start"
        style={{ background: "rgba(47,111,137,0.06)", border: "1px solid rgba(47,111,137,0.16)" }}
        data-testid="card-empty-community"
      >
        <div className="w-9 h-9 rounded-full bg-sky-600/10 flex items-center justify-center shrink-0 mt-0.5">
          <Users className="w-4 h-4 text-[#2F6F89] dark:text-sky-300" />
        </div>
        <div>
           <p className="text-sm font-semibold">{t.ui.matchesCommunityTitle}</p>
           <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.ui.matchesCommunityDesc}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function MatchesPage() {
  const { data: currentUser } = useCurrentUser();
  const { data: matches, isLoading, isError, isFetching, refetch } = useMatches();
  const [selectedMatch, setSelectedMatch] = useState<{ id: number, user: any } | null>(null);
  const [activeTab, setActiveTab] = useState<"connections" | "help">("connections");
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [helpTarget, setHelpTarget] = useState<{ id: string; name: string } | null>(null);
  const [helpType, setHelpType] = useState<"free" | "paid" | null>(null);
  const [helpAmount, setHelpAmount] = useState("");
  const [blockedMatchUserIds, setBlockedMatchUserIds] = useState<string[]>([]);
  const { toast } = useToast();
  const t = useTranslation();
  const { language } = useI18n();
  const matchCopy = MATCHES_PAGE_LOCALE_COPY[language].matchFallbacks;
  const connectionText = connectionCopy[language];

  const proactiveHelpMutation = useMutation({
    mutationFn: ({ targetUserId, type, amount }: { targetUserId: string; type: "free" | "paid"; amount?: number }) =>
      apiRequest('POST', `/api/proactive-help/${targetUserId}`, { type, amount }),
    onSuccess: () => {
       toast({ title: t.ui.matchesOfferSent, description: t.ui.matchesOfferSentDesc });
      setShowHelpDialog(false);
      setHelpType(null);
      setHelpAmount("");
    },
     onError: () => toast({ title: t.common.error, description: t.ui.matchesOfferError, variant: "destructive" }),
  });

  if (!currentUser) return null;

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const visibleMatches = matches?.filter(match => !blockedMatchUserIds.includes(match.otherUser.id)) ?? [];
  const matchCount = visibleMatches.length;
  const sortedMatches = sortConnectionsNewestFirst(visibleMatches);

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header with main tabs */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 pt-5 pb-2">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="text-2xl font-display font-bold">{t.matches.title}</h1>
          <Button variant="outline" size="sm" disabled={isFetching} data-testid="button-refresh-connections" onClick={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ["/api/matches/requests"] });
            queryClient.invalidateQueries({ queryKey: ["/api/matches/incoming"] });
          }}>
            {connectionText.refresh}
          </Button>
        </div>
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          <button
            onClick={() => setActiveTab("connections")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg font-medium transition-all ${activeTab === "connections" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            data-testid="tab-connections"
          >
            <MessageCircle className="w-3.5 h-3.5" />
             {t.ui.matchesConnectionsTab} {matchCount > 0 && <span className="text-primary">({matchCount})</span>}
          </button>
          <button
            onClick={() => setActiveTab("help")}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg font-medium transition-all ${activeTab === "help" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            data-testid="tab-help"
          >
            <HandHeart className="w-3.5 h-3.5" />
             {t.ui.matchesHelpTab}
          </button>
        </div>
      </div>

      {/* Ayuda Local tab */}
      {activeTab === "help" && (
        <LocalHelpPanel />
      )}

      {/* Connections tab */}
      {activeTab === "connections" && (
      <div className="flex-1 px-4 pt-4">
      <p className="text-xs text-muted-foreground mb-4">{connectionText.mutualExplanation}</p>
      <SentConnectionRequests />
      {isError && <p role="status" className="text-sm text-destructive mb-4" data-testid="matches-load-error">{connectionText.loadError}</p>}

      {/* No photo warning */}
      {!hasProfilePhoto(currentUser) && (
        <Link href="/profile">
          <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-400/30 p-3 flex items-center gap-3 cursor-pointer hover:bg-rose-500/15 transition-colors" data-testid="banner-matches-add-photo">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-sm font-medium text-rose-700 dark:text-rose-400">{t.ui.matchesNoPhoto}</p>
               <p className="text-xs text-muted-foreground">{t.ui.matchesNoPhotoDesc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        </Link>
      )}

      {matchCount === 0 ? (
        !isError && <EmptyState />
      ) : (
        <>
          {/* Matches list with recommendation cards every 2 matches */}
          <div className="space-y-3">
            {sortedMatches.flatMap((match, idx) => {
              const items = [];
              if (idx > 0 && idx % 2 === 0) {
                items.push(<RecommendationCard key={`reco-${idx}`} index={Math.floor(idx / 2) - 1} />);
              }
              items.push(
                <div
                  key={match.id}
                  className="group relative bg-card p-4 rounded-2xl border shadow-sm hover:shadow-lg transition-all flex items-center gap-4"
                  data-testid={`match-card-${match.id}`}
                >
                  <div className="relative">
                    {match.otherUser.isVerified === "true" && (match.otherUser.photos?.[0]?.url || match.otherUser.profileImageUrl) ? (
                      <img
                        src={match.otherUser.photos?.[0]?.url || match.otherUser.profileImageUrl || undefined}
                        alt={match.otherUser.firstName || matchCopy.travelerAlt}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-full bg-sky-600/10 border-2 border-white shadow-md flex items-center justify-center"
                        aria-label={matchCopy.verifiedPhotoLabel}
                      >
                        <Users className="w-7 h-7 text-[#2F6F89]/65 dark:text-sky-300" />
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold font-display truncate flex items-center gap-1">
                      {match.otherUser.firstName || matchCopy.someone}
                      {match.otherUser.isVerified === "true" && (
                        <Shield className="w-4 h-4 text-blue-500" />
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {match.otherUser.profile?.bio || matchCopy.icebreaker}
                    </p>
                    {formatConnectionTime(match.createdAt, language) && (
                      <time
                        className="mt-1 block text-xs text-muted-foreground"
                        dateTime={new Date(match.createdAt as string | Date).toISOString()}
                        data-testid={`match-timestamp-${match.id}`}
                      >
                        {connectionText.matchesRequestDate} · {formatConnectionTime(match.createdAt, language)}
                      </time>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                      title={matchCopy.helpButtonTitle}
                      onClick={() => {
                        setHelpTarget({ id: match.otherUser.id, name: match.otherUser.firstName || matchCopy.thisPerson });
                        setShowHelpDialog(true);
                      }}
                      data-testid={`button-help-${match.id}`}
                    >
                      <HandHeart className="w-5 h-5" />
                    </Button>
                    <Link href={`/chat/${match.id}`}>
                      <Button variant="default" size="icon" className="rounded-full" data-testid={`button-chat-${match.id}`}>
                        <MessageCircle className="w-5 h-5" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full"
                      onClick={() => setSelectedMatch({ id: match.id, user: match.otherUser })}
                      data-testid={`button-rate-${match.id}`}
                    >
                      <Star className="w-5 h-5" />
                    </Button>
                    <ConnectionSafetyActions
                      userId={match.otherUser.id}
                      userName={match.otherUser.firstName || matchCopy.thisPerson}
                      testId={`match-${match.id}`}
                      onBlocked={() => setBlockedMatchUserIds(previous => previous.includes(match.otherUser.id) ? previous : [...previous, match.otherUser.id])}
                    />
                  </div>
                </div>
              );
              return items;
            })}
          </div>

          {/* Engagement cards below matches */}
          <EngagementCards matchCount={matchCount} />
        </>
      )}

      {selectedMatch && (
        <MatchRatingModal
          isOpen={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          matchId={selectedMatch.id}
          user={selectedMatch.user}
        />
      )}

      </div>
      )}

      {/* Help offer dialog */}
      <Dialog open={showHelpDialog} onOpenChange={(open) => { setShowHelpDialog(open); if (!open) { setHelpType(null); setHelpAmount(""); } }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
             <DialogTitle className="text-base">{t.ui.matchesOfferTitle.replace("{name}", helpTarget?.name || "")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
             <p className="text-sm text-muted-foreground">{t.ui.matchesHowHelp}</p>
            <button
              onClick={() => setHelpType("free")}
              className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${helpType === "free" ? "border-emerald-500 bg-emerald-500/5" : "border-border hover:border-emerald-500/40"}`}
              data-testid="match-help-option-free"
            >
              <span className="text-2xl">🤝</span>
              <div>
                 <p className="font-semibold text-sm">{t.ui.matchesFreeHelp}</p>
                 <p className="text-xs text-muted-foreground mt-0.5">{t.ui.matchesFreeHelpDesc}</p>
              </div>
            </button>
            <button
              onClick={() => setHelpType("paid")}
              className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${helpType === "paid" ? "border-amber-500 bg-amber-500/5" : "border-border hover:border-amber-500/40"}`}
              data-testid="match-help-option-paid"
            >
              <span className="text-2xl">💶</span>
              <div>
                 <p className="font-semibold text-sm">{t.ui.matchesPaidHelp}</p>
                 <p className="text-xs text-muted-foreground mt-0.5">{t.ui.matchesPaidHelpDesc}</p>
              </div>
            </button>
            {helpType === "paid" && (
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="1"
                   placeholder={t.ui.matchesMinAmount}
                  value={helpAmount}
                  onChange={e => setHelpAmount(e.target.value)}
                  className="pl-9"
                  data-testid="match-input-help-amount"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
             <Button variant="outline" onClick={() => setShowHelpDialog(false)} className="flex-1">{t.common.cancel}</Button>
            <Button
              onClick={() => {
                if (!helpTarget || !helpType) return;
                proactiveHelpMutation.mutate({
                  targetUserId: helpTarget.id,
                  type: helpType,
                  amount: helpType === "paid" && helpAmount ? parseInt(helpAmount) : undefined,
                });
              }}
              disabled={!helpType || (helpType === "paid" && !helpAmount) || proactiveHelpMutation.isPending}
              className="flex-1"
              data-testid="match-button-send-help"
            >
               {proactiveHelpMutation.isPending ? t.ui.matchesSending : t.ui.matchesSendOffer}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
