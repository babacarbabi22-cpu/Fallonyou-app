import { useSwipeFeed, useSwipeRight, useCurrentUser, UserWithPhotos } from "@/hooks/use-danceme";
import { useTranslation } from "@/lib/i18n";
import { SwipeCard } from "@/components/SwipeCard";
import { BottomNav } from "@/components/BottomNav";
import { SocialProofTicker } from "@/components/SocialProofTicker";
import { ProfileDetailSheet } from "@/components/ProfileDetailSheet";
import { MatchHeartCascade } from "@/components/HeartCascade";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles, SlidersHorizontal, Star, X, Heart, Plane, Camera, MapPin, CalendarDays, Zap, Crown, Lock, HandHeart, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import posterImg from "@assets/poster_adventure_base.png";

// ─── Promo Card ──────────────────────────────────────────────────────────────
function PromoCard({ onDismiss, onCTA }: { onDismiss: () => void; onCTA: () => void }) {
  const dragX = useRef(0);

  return (
    <motion.div
      key="promo-card"
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -30 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      drag="x"
      dragConstraints={{ left: -160, right: 160 }}
      onDrag={(_, info) => { dragX.current = info.offset.x; }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 100) onDismiss();
      }}
      className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing select-none"
      style={{ zIndex: 50, touchAction: "none" }}
      data-testid="promo-card"
    >
      {/* Background image */}
      <img
        src={posterImg}
        alt="FallonYou planes"
        className="w-full h-full object-cover object-top pointer-events-none"
        draggable={false}
      />

      {/* Top gradient + brand */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/85" />

      {/* Top: brand name */}
      <div className="absolute top-5 left-0 right-0 flex flex-col items-center gap-0.5">
        <span className="font-display font-black text-3xl italic"
          style={{ background: "linear-gradient(90deg,#F59E0B,#FCD34D,#F59E0B)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          FallonYou
        </span>
        <span className="text-white/70 text-xs tracking-[4px] font-light uppercase">
          Planes · Viajes · Conexiones
        </span>
      </div>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors z-10"
        data-testid="promo-card-dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Bottom: text + CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-3">
        <div>
          <p className="text-white font-bold text-2xl leading-tight font-display italic">
            ¿Y si el plan perfecto
          </p>
          <p className="text-amber-400 font-bold text-2xl leading-tight font-display italic">
            eres tú?
          </p>
          <p className="text-white/75 text-sm mt-1.5 leading-relaxed">
            Únete a planes, conoce gente y vive aventuras reales cerca de ti.
          </p>
        </div>

        <div className="flex gap-2 mt-1">
          <Button
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl h-11 shadow-lg shadow-amber-900/40"
            onClick={onCTA}
            data-testid="promo-card-cta"
          >
            <CalendarDays className="w-4 h-4 mr-1.5" />
            Ver planes
          </Button>
          <Button
            variant="outline"
            className="border-white/30 text-white bg-white/10 hover:bg-white/20 rounded-xl h-11 px-4"
            onClick={onDismiss}
            data-testid="promo-card-skip"
          >
            Seguir
          </Button>
        </div>

        {/* Swipe hint */}
        <p className="text-white/40 text-xs text-center">Desliza para cerrar</p>
      </div>
    </motion.div>
  );
}

// Preload images for faster display
function preloadImages(urls: string[]) {
  urls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
}

// How many swipes between promo card appearances
const PROMO_EVERY = 5;

export default function SwipePage() {
  const t = useTranslation();
  const { data: currentUser, isLoading: isAuthLoading } = useCurrentUser();
  const { data: users, isLoading: isUsersLoading, refetch } = useSwipeFeed();
  const { mutate: swipeRight } = useSwipeRight();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [activeUsers, setActiveUsers] = useState<typeof users>([]);
  const [matchAnimation, setMatchAnimation] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithPhotos | null>(null);
  const [showProfileDetail, setShowProfileDetail] = useState(false);
  const [swipeCount, setSwipeCount] = useState(0);
  const [showPromoCard, setShowPromoCard] = useState(false);
  const [sparkDismissed, setSparkDismissed] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [helpTargetUserId, setHelpTargetUserId] = useState<number | null>(null);
  const [helpTargetName, setHelpTargetName] = useState<string>("");
  const [helpType, setHelpType] = useState<"free" | "paid" | null>(null);
  const [helpAmount, setHelpAmount] = useState("");

  const { data: dailySpark } = useQuery<any>({
    queryKey: ["/api/daily-spark"],
    staleTime: 1000 * 60 * 5,
  });

  const { data: premiumStatus } = useQuery<{
    isPremium: boolean; remainingLikes: number; canLike: boolean;
  }>({ queryKey: ["/api/premium/status"], staleTime: 1000 * 60 });
  
  // Preload all user photos when feed is loaded
  useEffect(() => {
    if (users && users.length > 0) {
      const photoUrls = users.flatMap(user => 
        [user.photos?.[0]?.url, user.profileImageUrl].filter(Boolean) as string[]
      );
      preloadImages(photoUrls);
    }
  }, [users]);
  const [localPrefs, setLocalPrefs] = useState({
    minAge: 18,
    maxAge: 50,
    maxDistance: 50,
    showMe: 'everyone'
  });

  const { data: preferences } = useQuery({
    queryKey: ['/api/preferences'],
  });

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        minAge: preferences.minAge ?? 18,
        maxAge: preferences.maxAge ?? 50,
        maxDistance: preferences.maxDistance ?? 50,
        showMe: preferences.showMe ?? 'everyone'
      });
    }
  }, [preferences]);

  const { data: superLikeStatus, refetch: refetchSuperLike } = useQuery({
    queryKey: ['/api/super-likes/status'],
  });

  const { data: likesReceived } = useQuery({
    queryKey: ['/api/premium/liked-by'],
  });

  const updatePreferences = useMutation({
    mutationFn: async (prefs: any) => {
      const res = await apiRequest('PATCH', '/api/preferences', prefs);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/preferences'] });
      refetch();
    }
  });

  const proactiveHelpMutation = useMutation({
    mutationFn: ({ targetUserId, type, amount }: { targetUserId: number; type: "free" | "paid"; amount?: number }) =>
      apiRequest('POST', `/api/proactive-help/${targetUserId}`, { type, amount }),
    onSuccess: () => {
      toast({ title: "🤝 ¡Oferta enviada!", description: "Le hemos notificado que puedes ayudarle." });
      setShowHelpDialog(false);
      setHelpType(null);
      setHelpAmount("");
    },
    onError: () => toast({ title: "Error", description: "No se pudo enviar la oferta", variant: "destructive" }),
  });

  const superLikeMutation = useMutation({
    mutationFn: async ({ toUserId, userId }: { toUserId: string; userId: number }) => {
      const res = await apiRequest('POST', '/api/super-likes', { toUserId });
      return { ...(await res.json()), userId };
    },
    onSuccess: (data) => {
      refetchSuperLike();
      setActiveUsers((prev) => prev?.filter((u) => u.id !== data.userId));
      if (data.isMatch) {
        setMatchAnimation(true);
        setTimeout(() => setMatchAnimation(false), 2000);
      }
      toast({
        title: "Super Like sent!",
        description: "They'll see you liked them with a star",
      });
    },
    onError: () => {
      toast({
        title: "Sin super likes disponibles",
        description: "Has usado todos tus super likes de hoy.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (users) {
      setActiveUsers(users);
    }
  }, [users]);

  // Auth check
  if (!isAuthLoading && !currentUser) {
    window.location.href = "/auth";
    return null;
  }

  // Photo gate — must have a profile photo to discover others
  const hasAnyPhoto = currentUser?.profileImageUrl || (currentUser?.photos && currentUser.photos.length > 0);
  if (!isAuthLoading && currentUser && !hasAnyPhoto) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center border-4 border-dashed border-amber-400 animate-pulse">
              <Camera className="w-14 h-14 text-amber-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-rose-500 flex items-center justify-center border-2 border-background">
              <X className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="space-y-2 max-w-xs">
            <h2 className="text-2xl font-bold">Añade una foto primero</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para poder ver y conectar con otras personas necesitas una foto de perfil. Los demás también quieren saber quién eres. 😊
            </p>
          </div>

          <Button
            className="bg-amber-500 hover:bg-amber-600 w-full max-w-xs"
            onClick={() => { window.location.href = "/profile"; }}
            data-testid="button-go-to-profile"
          >
            <Camera className="w-4 h-4 mr-2" />
            Añadir foto de perfil
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const handleSwipe = (userId: number, direction: "left" | "right") => {
    setActiveUsers((prev) => prev?.filter((u) => u.id !== userId));

    const nextCount = swipeCount + 1;
    setSwipeCount(nextCount);
    if (nextCount % PROMO_EVERY === 0) {
      setShowPromoCard(true);
    }

    if (direction === "right") {
      swipeRight(userId, {
        onSuccess: (data) => {
          if (data) {
            setMatchAnimation(true);
            setTimeout(() => setMatchAnimation(false), 2000);
          }
        },
      });
    }
  };

  if (isAuthLoading || isUsersLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden pb-20">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <h1 className="text-3xl font-display font-black"><span className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 bg-clip-text text-transparent">Fallon</span><span className="text-foreground">You</span></h1>
        <div className="flex items-center gap-2">
          {/* Likes counter for free users */}
          {premiumStatus && !premiumStatus.isPremium && (
            <button
              onClick={() => navigate("/premium")}
              data-testid="badge-likes-remaining"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all"
              style={{
                background: premiumStatus.remainingLikes <= 3
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(245,158,11,0.12)",
                border: `1px solid ${premiumStatus.remainingLikes <= 3 ? "rgba(239,68,68,0.35)" : "rgba(245,158,11,0.3)"}`,
                color: premiumStatus.remainingLikes <= 3 ? "#ef4444" : "#f59e0b",
              }}
            >
              <Heart className="w-3 h-3 fill-current" />
              {premiumStatus.remainingLikes}
            </button>
          )}
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-filters">
                <SlidersHorizontal className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Preferencias de descubrimiento</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-3">
                  <Label>Edad: {localPrefs.minAge} - {localPrefs.maxAge} años</Label>
                  <Slider
                    value={[localPrefs.minAge, localPrefs.maxAge]}
                    min={18}
                    max={70}
                    step={1}
                    onValueChange={([min, max]) => {
                      setLocalPrefs(prev => ({ ...prev, minAge: min, maxAge: max }));
                    }}
                    onValueCommit={([min, max]) => {
                      updatePreferences.mutate({ minAge: min, maxAge: max });
                    }}
                    data-testid="slider-age-range"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Distancia máxima: {localPrefs.maxDistance} km</Label>
                  <Slider
                    value={[localPrefs.maxDistance]}
                    min={5}
                    max={200}
                    step={5}
                    onValueChange={([dist]) => {
                      setLocalPrefs(prev => ({ ...prev, maxDistance: dist }));
                    }}
                    onValueCommit={([dist]) => {
                      updatePreferences.mutate({ maxDistance: dist });
                    }}
                    data-testid="slider-distance"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Mostrar</Label>
                  <Select
                    value={localPrefs.showMe}
                    onValueChange={(value) => {
                      setLocalPrefs(prev => ({ ...prev, showMe: value }));
                      updatePreferences.mutate({ showMe: value });
                    }}
                  >
                    <SelectTrigger data-testid="select-show-me">
                      <SelectValue placeholder="Elige una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Todos</SelectItem>
                      <SelectItem value="men">Hombres</SelectItem>
                      <SelectItem value="women">Mujeres</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 p-[2px]">
             <img 
               src={currentUser?.photos?.[0]?.url || currentUser?.profileImageUrl || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&auto=format&fit=crop&q=60"} 
               className="w-full h-full rounded-full object-cover border-2 border-white"
               alt="Profile"
             />
          </div>
        </div>
      </div>

      {/* Who Liked You Banner — informational only, no payment */}
      {(likesReceived as any)?.count > 0 && (
        <div className="px-4 mb-3">
          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl p-3 shadow-lg relative overflow-hidden">
            <Star className="absolute top-1 right-12 w-3 h-3 text-white/30 fill-white/30" />
            <Star className="absolute top-3 right-20 w-2 h-2 text-white/20 fill-white/20" />
            <Star className="absolute bottom-2 right-16 w-2.5 h-2.5 text-white/25 fill-white/25" />
            <Star className="absolute top-2 left-2 w-2 h-2 text-white/20 fill-white/20" />
            <Star className="absolute bottom-1 left-16 w-3 h-3 text-white/25 fill-white/25" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <Star className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">
                  {(likesReceived as any).count === 1
                    ? '¡1 persona está interesada en ti!'
                    : `¡${(likesReceived as any).count} personas están interesadas en ti!`}
                </p>
                <p className="text-white/80 text-xs">Sigue deslizando para hacer match</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Spark del día ─────────────────────────────────────────────────── */}
      {dailySpark && !sparkDismissed && (
        <div className="px-4 mb-3">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl overflow-hidden shadow-lg"
            style={{ background: "linear-gradient(135deg, #1a0a00 0%, #3d1f00 50%, #1a0a00 100%)" }}
          >
            {/* gold shimmer border */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: "inset 0 0 0 1.5px rgba(245,158,11,0.4)" }} />

            <div className="flex items-center gap-3 p-3 pr-2">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-amber-400/60">
                  <img
                    src={dailySpark.photos?.[0]?.url || dailySpark.profileImageUrl || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&q=80"}
                    alt={dailySpark.firstName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                  <Zap className="w-3 h-3 text-white fill-white" />
                </div>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400">⚡ Spark del día</span>
                </div>
                <p className="font-bold text-white text-sm leading-tight truncate">
                  {dailySpark.firstName}{dailySpark.age ? `, ${dailySpark.age}` : ""}
                </p>
                {(dailySpark.occupation || dailySpark.currentCity) && (
                  <p className="text-amber-200/70 text-xs truncate">
                    {[dailySpark.occupation, dailySpark.currentCity].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>

              {/* CTA */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    const sparkUser = activeUsers?.find(u => u.id === dailySpark.id);
                    if (sparkUser) {
                      setSelectedUser(sparkUser);
                      setShowProfileDetail(true);
                    }
                    setSparkDismissed(true);
                  }}
                  className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-colors active:scale-95"
                  data-testid="button-spark-view"
                >
                  Ver
                </button>
                <button
                  onClick={() => setSparkDismissed(true)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
                  data-testid="button-spark-dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 24h countdown */}
            <div className="px-3 pb-2 -mt-1">
              <p className="text-[10px] text-amber-400/60 text-right">Se renueva en 24h ⏳</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Reto semanal ──────────────────────────────────────────────────── */}
      {(() => {
        const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
        const challenges = [
          { emoji: "🗣️", text: "Inicia una conversación con alguien de otro país" },
          { emoji: "📸", text: "Añade una foto nueva a tu perfil esta semana" },
          { emoji: "🗺️", text: "Añade tu próximo destino a tu perfil" },
          { emoji: "🎉", text: "Únete a una actividad que nunca hayas probado" },
          { emoji: "⚡", text: "Activa 'Disponible hoy' y queda con alguien" },
          { emoji: "🌍", text: "Conecta con alguien de una ciudad diferente" },
          { emoji: "✍️", text: "Completa tu bio con algo que te defina de verdad" },
          { emoji: "🤝", text: "Asiste a un evento y conoce al organizador" },
        ];
        const challenge = challenges[weekNum % challenges.length];
        return (
          <div className="px-4 mb-3">
            <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-950/30 via-black/40 to-amber-950/30 p-3 flex items-center gap-3" data-testid="card-weekly-challenge">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl shrink-0">
                {challenge.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold tracking-widest uppercase text-amber-500 mb-0.5">⚡ Reto semanal</p>
                <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{challenge.text}</p>
                {challenge.tip && (
                  <p className="text-[10px] text-amber-400/70 mt-1 leading-snug line-clamp-1">💡 {challenge.tip}</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Likes agotados ── */}
      {premiumStatus && !premiumStatus.isPremium && !premiumStatus.canLike && (
        <div className="px-4 mt-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl overflow-hidden text-center py-10 px-6 flex flex-col items-center gap-4"
            style={{ background: "linear-gradient(135deg,#1a0a00,#3d1f00,#1a0a00)", border: "1px solid rgba(245,158,11,0.3)" }}
            data-testid="card-likes-exhausted"
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>
              <Lock className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-xl mb-1">Has llegado al límite diario</p>
              <p className="text-amber-300/70 text-sm leading-relaxed">
                Los usuarios gratuitos tienen 10 likes al día.<br />
                Vuelve mañana o hazte Premium para conectar sin límites.
              </p>
            </div>
            <Button
              className="w-full font-bold py-5 rounded-2xl"
              style={{ background: "linear-gradient(90deg,#FCD34D,#F59E0B)", color: "#000" }}
              onClick={() => navigate("/premium")}
              data-testid="button-get-premium-from-wall"
            >
              <Crown className="w-5 h-5 mr-2" />
              Ver Premium — desde €5/mes
            </Button>
            <p className="text-amber-400/50 text-xs">7 días gratis · Cancela cuando quieras</p>
          </motion.div>
        </div>
      )}

      {/* Card Stack */}
      {(!premiumStatus || premiumStatus.isPremium || premiumStatus.canLike) && (
      <div className="relative w-full max-w-md mx-auto h-[65vh] px-4 mt-2">
        <AnimatePresence>
          {/* Promotional card — appears every PROMO_EVERY swipes */}
          {showPromoCard && (
            <PromoCard
              key="promo"
              onDismiss={() => setShowPromoCard(false)}
              onCTA={() => { setShowPromoCard(false); navigate("/events"); }}
            />
          )}

          {!showPromoCard && activeUsers && activeUsers.length > 0 ? (
            activeUsers.map((user, index) => {
              if (index > activeUsers.length - 3) {
                 return (
                   <div key={user.id} className="absolute inset-x-4 inset-y-0" style={{ zIndex: index }}>
                     <SwipeCard 
                       user={user} 
                       onSwipe={(dir) => handleSwipe(user.id, dir)} 
                       onTap={() => {
                         setSelectedUser(user);
                         setShowProfileDetail(true);
                       }}
                     />
                   </div>
                 );
              }
              return null;
            })
          ) : !showPromoCard ? (
             <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-card rounded-3xl border border-dashed">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold">Sin más perfiles</h3>
                <p className="text-muted-foreground mt-2 mb-6">Vuelve pronto para ver más personas cerca de ti.</p>
                <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh">
                  Actualizar
                </Button>
             </div>
          ) : null}
        </AnimatePresence>
      </div>
      )}

      {/* Action Buttons */}
      {(!premiumStatus || premiumStatus.isPremium || premiumStatus.canLike) && !showPromoCard && activeUsers && activeUsers.length > 0 && (
        <div className="flex justify-center gap-6 mt-4">
          <Button
            variant="outline"
            size="icon"
            className="w-14 h-14 rounded-full border-2 border-red-200 text-red-500 hover:bg-red-50"
            onClick={() => {
              const topUser = activeUsers[activeUsers.length - 1];
              if (topUser) handleSwipe(topUser.id, 'left');
            }}
            data-testid="button-pass"
          >
            <X className="w-7 h-7" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-14 h-14 rounded-full border-2 border-blue-200 text-blue-500 hover:bg-blue-50"
            onClick={() => {
              const topUser = activeUsers[activeUsers.length - 1];
              if (topUser) {
                superLikeMutation.mutate({ toUserId: topUser.id.toString(), userId: topUser.id });
              }
            }}
            disabled={!(superLikeStatus as any)?.canSuperLike || superLikeMutation.isPending}
            data-testid="button-super-like"
          >
            <Star className="w-7 h-7" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-14 h-14 rounded-full border-2 border-amber-300 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950"
            onClick={() => {
              const topUser = activeUsers[activeUsers.length - 1];
              if (topUser) handleSwipe(topUser.id, 'right');
            }}
            data-testid="button-like"
          >
            <Star className="w-7 h-7 fill-current" />
          </Button>
        </div>
      )}

      {/* "También puedo ayudarte" button */}
      {!showPromoCard && activeUsers && activeUsers.length > 0 && (
        <div className="flex justify-center mt-3">
          <button
            onClick={() => {
              const topUser = activeUsers[activeUsers.length - 1];
              if (topUser) {
                setHelpTargetUserId(topUser.id);
                setHelpTargetName(topUser.firstName || "esta persona");
                setHelpType(null);
                setHelpAmount("");
                setShowHelpDialog(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-muted-foreground border border-border hover:border-emerald-500/50 hover:text-emerald-600 hover:bg-emerald-500/5 transition-all"
            data-testid="button-can-help"
          >
            <HandHeart className="w-4 h-4" />
            También puedo ayudarte
          </button>
        </div>
      )}

      {/* Help offer dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">🤝 Ofrecer ayuda a {helpTargetName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">¿Cómo quieres ayudarle?</p>

            {/* Free option */}
            <button
              onClick={() => setHelpType("free")}
              className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${helpType === "free" ? "border-emerald-500 bg-emerald-500/5" : "border-border hover:border-emerald-500/40"}`}
              data-testid="help-option-free"
            >
              <span className="text-2xl">❤️</span>
              <div>
                <p className="font-semibold text-sm">Sin pedir nada a cambio</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ayudo porque sí. La comunidad funciona así.</p>
              </div>
            </button>

            {/* Paid option */}
            <button
              onClick={() => setHelpType("paid")}
              className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${helpType === "paid" ? "border-amber-500 bg-amber-500/5" : "border-border hover:border-amber-500/40"}`}
              data-testid="help-option-paid"
            >
              <span className="text-2xl">💶</span>
              <div>
                <p className="font-semibold text-sm">A cambio de un mínimo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Mi tiempo también vale. Indico un precio mínimo.</p>
              </div>
            </button>

            {/* Amount input for paid */}
            {helpType === "paid" && (
              <div className="relative mt-1">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="1"
                  placeholder="Mínimo (€)"
                  value={helpAmount}
                  onChange={e => setHelpAmount(e.target.value)}
                  className="pl-9"
                  data-testid="input-help-min-amount"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => setShowHelpDialog(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!helpTargetUserId || !helpType) return;
                proactiveHelpMutation.mutate({
                  targetUserId: helpTargetUserId,
                  type: helpType,
                  amount: helpType === "paid" && helpAmount ? parseInt(helpAmount) : undefined,
                });
              }}
              disabled={!helpType || (helpType === "paid" && !helpAmount) || proactiveHelpMutation.isPending}
              className="flex-1"
              data-testid="button-send-help-offer"
            >
              {proactiveHelpMutation.isPending ? "Enviando..." : "Enviar oferta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Match Overlay Animation with Heart Cascade */}
      <MatchHeartCascade isActive={matchAnimation} duration={3000} />
      <AnimatePresence>
        {matchAnimation && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <Plane className="w-24 h-24 text-amber-500 fill-amber-500 mx-auto mb-4 drop-shadow-2xl -rotate-45" />
              </motion.div>
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-5xl md:text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 drop-shadow-2xl"
              >
                ¡NUEVA CONEXIÓN!
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/80 text-lg mt-4"
              >
                ¡Empieza a chatear ahora!
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Detail Sheet */}
      <ProfileDetailSheet 
        user={selectedUser}
        open={showProfileDetail}
        onOpenChange={setShowProfileDetail}
      />

      {/* Business partnership banner — compact */}
      <div className="px-4 pb-2">
        <a
          href={`mailto:fallonyouapp@hotmail.com?subject=${t.activities.businessEmailSubject}&body=${t.activities.businessEmailBody}`}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 group"
          style={{
            background: "linear-gradient(135deg, rgba(10,10,10,0.9), rgba(26,18,0,0.95))",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
          data-testid="banner-business-swipe"
        >
          <span className="text-xl shrink-0">🏢</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white leading-none">{t.activities.businessTitleCompact}</p>
            <p className="text-[10px] text-white/45 mt-0.5">{t.activities.businessSubtitleCompact}</p>
          </div>
          <span className="text-[10px] font-semibold text-amber-400 whitespace-nowrap shrink-0 group-hover:underline">{t.activities.businessContact}</span>
        </a>
      </div>

      <SocialProofTicker />
      <BottomNav />
    </div>
  );
}
