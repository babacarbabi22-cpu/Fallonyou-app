import { useMatches, useCurrentUser } from "@/hooks/use-danceme";
import { BottomNav } from "@/components/BottomNav";
import { MatchRatingModal } from "@/components/MatchRatingModal";
import { useState } from "react";
import { Loader2, MessageCircle, Star, Shield, Heart, Camera, ArrowRight, CalendarDays, Users, Sparkles, MapPin, Plane } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

// ── Engagement cards shown below the matches list ──────────────────────────
function EngagementCards({ matchCount }: { matchCount: number }) {
  const [, navigate] = useLocation();
  return (
    <div className="space-y-3 mt-5">

      {/* Create a plan card */}
      <div
        className="rounded-2xl overflow-hidden cursor-pointer group"
        style={{
          background: "linear-gradient(135deg,#92400e 0%,#b45309 40%,#d97706 100%)",
          boxShadow: "0 4px 20px rgba(180,83,9,0.35)",
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
              {matchCount > 0 ? "¿Quedáis en persona?" : "Crea el primer plan"}
            </p>
            <p className="text-white/70 text-xs mt-0.5 leading-snug">
              {matchCount > 0
                ? "Propón una actividad a tus matches y conócelos de verdad."
                : "Organiza algo y que la gente se apunte. ¡Somos todos amigos aquí!"}
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
        style={{ borderColor: "rgba(245,158,11,0.2)" }}
        onClick={() => navigate("/")}
        data-testid="card-discover-more"
      >
        <div className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base text-foreground leading-tight">Descubre más personas</p>
            <p className="text-muted-foreground text-xs mt-0.5 leading-snug">
              Hay gente nueva cerca de ti esperando conectar.
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-amber-500/10 transition-colors">
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Community vibe card */}
      <div
        className="rounded-2xl p-4 text-center"
        style={{
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.15)",
        }}
        data-testid="card-community-tip"
      >
        <div className="flex justify-center gap-1 mb-2">
          {["🌍","✈️","🏖️","🎉","🤝"].map((e, i) => (
            <span key={i} className="text-lg">{e}</span>
          ))}
        </div>
        <p className="text-sm font-semibold text-foreground">
          Aquí todos somos amigos
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          FallonYou es una comunidad real. Sé tú mismo, propón planes y disfruta conociendo gente sin filtros.
        </p>
      </div>
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────
function EmptyState() {
  const [, navigate] = useLocation();
  return (
    <div className="py-8 space-y-4">
      {/* Hero empty card */}
      <div className="text-center py-8 px-4">
        <div
          className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))", border: "2px dashed rgba(245,158,11,0.3)" }}
        >
          <Heart className="w-9 h-9 text-amber-500/60" />
        </div>
        <h3 className="text-xl font-bold mb-1">Aún sin matches</h3>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Desliza perfiles y cuando alguien te guste también, ¡aparecerán aquí!
        </p>
        <Button
          className="mt-4 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl px-6"
          onClick={() => navigate("/")}
          data-testid="button-go-discover"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Descubrir personas
        </Button>
      </div>

      {/* Divider with text */}
      <div className="flex items-center gap-3 px-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium">mientras tanto</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Start with events */}
      <div
        className="rounded-2xl overflow-hidden cursor-pointer group"
        style={{
          background: "linear-gradient(135deg,#92400e 0%,#b45309 40%,#d97706 100%)",
          boxShadow: "0 4px 20px rgba(180,83,9,0.3)",
        }}
        onClick={() => navigate("/events")}
        data-testid="card-empty-create-plan"
      >
        <div className="p-5 text-center">
          <CalendarDays className="w-8 h-8 text-white/80 mx-auto mb-2" />
          <p className="text-white font-bold text-base">Crea un plan y conoce gente</p>
          <p className="text-white/65 text-xs mt-1 leading-relaxed">
            Los planes son la forma más fácil de conocer personas reales. Organiza algo y que se apunte quien quiera.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 rounded-full px-4 py-1.5 text-white text-xs font-semibold">
            Ver planes y eventos <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Community tip */}
      <div
        className="rounded-2xl p-4 flex gap-3 items-start"
        style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
        data-testid="card-empty-community"
      >
        <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
          <Users className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-semibold">Somos una comunidad</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            En FallonYou todos nos conocemos. Completa tu perfil con una buena foto y bio para que los demás quieran conectar contigo.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function MatchesPage() {
  const { data: currentUser } = useCurrentUser();
  const { data: matches, isLoading } = useMatches();
  const [selectedMatch, setSelectedMatch] = useState<{ id: number, user: any } | null>(null);
  const t = useTranslation();

  if (!currentUser) return null;

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const matchCount = matches?.length ?? 0;

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6">
      <h1 className="text-3xl font-display font-bold mb-5 px-2">{t.matches.title}</h1>

      {/* No photo warning */}
      {!currentUser.profileImageUrl && (
        <Link href="/profile">
          <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-400/30 p-3 flex items-center gap-3 cursor-pointer hover:bg-rose-500/15 transition-colors" data-testid="banner-matches-add-photo">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-rose-700 dark:text-rose-400">Sin foto no apareces en Discover</p>
              <p className="text-xs text-muted-foreground">Toca para añadir tu foto y conseguir más matches.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        </Link>
      )}

      {matchCount === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Matches list */}
          <div className="space-y-3">
            {matches?.map((match) => (
              <div
                key={match.id}
                className="group relative bg-card p-4 rounded-2xl border shadow-sm hover:shadow-lg transition-all flex items-center gap-4"
                data-testid={`match-card-${match.id}`}
              >
                <div className="relative">
                  <img
                    src={match.otherUser.photos?.[0]?.url || match.otherUser.profileImageUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60"}
                    alt={match.otherUser.firstName || "Match"}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                  />
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold font-display truncate flex items-center gap-1">
                    {match.otherUser.firstName || "Alguien"}
                    {match.otherUser.isVerified === "true" && (
                      <Shield className="w-4 h-4 text-blue-500" />
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {match.otherUser.profile?.bio || "¡Di hola y rompe el hielo!"}
                  </p>
                </div>

                <div className="flex gap-2">
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
                </div>
              </div>
            ))}
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

      <BottomNav />
    </div>
  );
}
