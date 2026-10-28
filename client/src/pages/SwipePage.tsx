import { useSwipeFeed, useSwipeRight, useCurrentUser, UserWithPhotos, ConnectionError } from "@/hooks/use-danceme";
import { useTranslation, useI18n } from "@/lib/i18n";
import { connectionCopy } from "@/lib/connection-copy";
import { SwipeCard } from "@/components/SwipeCard";
import { BottomNav } from "@/components/BottomNav";
import { SocialProofTicker } from "@/components/SocialProofTicker";
import { ProfileDetailSheet } from "@/components/ProfileDetailSheet";
import { PublicProfileViewer } from "@/components/PublicProfileViewer";
import { publicProfileCopy } from "@/components/public-profile-copy";
import { hasProfilePhoto } from "@/lib/profile-photo";
import { createDiscoveryPreloader, discoveryPreloadUrls } from "@/lib/image-preload";
import { TravelLoading } from "@/components/TravelLoading";
import { MatchHeartCascade } from "@/components/HeartCascade"; 
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Sparkles, SlidersHorizontal, Star, X, Plane, Camera, MapPin, CalendarDays, Zap, Crown, Lock, HandHeart, Euro } from "lucide-react";
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
import posterImg from "@assets/poster_adventure_base.webp";

// ─── Promo Card ──────────────────────────────────────────────────────────────
function PromoCard({ onDismiss, onCTA }: { onDismiss: () => void; onCTA: () => void }) {
  const t = useTranslation();
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
        alt={t.discover.promo.imageAlt}
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
          {t.discover.promo.tagline}
        </span>
      </div>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white/80 hover:bg-black/60 transition-colors z-10"
        data-testid="promo-card-dismiss"
        aria-label={t.common.close}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Bottom: text + CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-3">
        <div>
          <p className="text-white font-bold text-2xl leading-tight font-display italic">
            {t.discover.promo.title}
          </p>
          <p className="text-amber-400 font-bold text-2xl leading-tight font-display italic">
            {t.discover.promo.titleAccent}
          </p>
          <p className="text-white/75 text-sm mt-1.5 leading-relaxed">
            {t.discover.promo.description}
          </p>
        </div>

        <div className="flex gap-2 mt-1">
          <Button
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl h-11 shadow-lg shadow-amber-900/40"
            onClick={onCTA}
            data-testid="promo-card-cta"
          >
            <CalendarDays className="w-4 h-4 mr-1.5" />
            {t.discover.promo.viewPlans}
          </Button>
          <Button
            variant="outline"
            className="border-white/30 text-white bg-white/10 hover:bg-white/20 rounded-xl h-11 px-4"
            onClick={onDismiss}
            data-testid="promo-card-skip"
          >
            {t.discover.promo.keepGoing}
          </Button>
        </div>

        {/* Swipe hint */}
        <p className="text-white/40 text-xs text-center">{t.discover.promo.swipeHint}</p>
      </div>
    </motion.div>
  );
}

// How many swipes between promo card appearances
const PROMO_EVERY = 5;

type PhotoMember = {
  id: string;
  firstName: string | null;
  age: number | null;
  currentCity: string | null;
  nextAdventure: string | null;
  favoriteDestinations: string[];
  notRecommendedDestinations: string[];
  photoUrl: string;
};

export default function SwipePage() {
  const t = useTranslation();
  const { language } = useI18n();
  const connectionText = connectionCopy[language];
  const profileCopy = publicProfileCopy[language];
  const { data: currentUser, isLoading: isAuthLoading } = useCurrentUser();
  const { data: users, isLoading: isUsersLoading, refetch, hasNextPage, fetchNextPage, isFetchingNextPage, isFetchNextPageError } = useSwipeFeed();
  const { mutate: swipeRight } = useSwipeRight();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [activeUsers, setActiveUsers] = useState<typeof users>([]);
  const removedMemberIds = useRef(new Set<string>());
  const [matchAnimation, setMatchAnimation] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showPhotoMembers, setShowPhotoMembers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithPhotos | null>(null);
  const [showProfileDetail, setShowProfileDetail] = useState(false);
  const [publicProfileUserId, setPublicProfileUserId] = useState<string | null>(null);
  const [swipeCount, setSwipeCount] = useState(0);
  const [showPromoCard, setShowPromoCard] = useState(false);
  const [sparkDismissed, setSparkDismissed] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [helpTargetUserId, setHelpTargetUserId] = useState<string | null>(null);
  const [helpTargetName, setHelpTargetName] = useState<string>("");
  const [helpType, setHelpType] = useState<"free" | "paid" | null>(null);
  const [helpAmount, setHelpAmount] = useState("");
  const hasAnyPhoto = hasProfilePhoto(currentUser);
  const photoDirectory = useInfiniteQuery({
    queryKey: ['/api/users/with-photos'],
    initialPageParam: undefined as string | undefined,
    enabled: hasAnyPhoto && showPhotoMembers,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: "24" });
      if (pageParam) params.set("cursor", pageParam);
      const response = await fetch(`/api/users/with-photos?${params}`, { credentials: 'include', signal });
      if (!response.ok) throw new Error('Could not load members');
      return { items: await response.json() as PhotoMember[], nextCursor: response.headers.get("X-Next-Cursor") || undefined };
    },
    getNextPageParam: page => page.nextCursor,
  });
  const photoMembers = photoDirectory.data?.pages.flatMap(page => page.items);
  const { isLoading: isPhotoMembersLoading, isError: photoMembersError, refetch: refetchPhotoMembers } = photoDirectory;
  const moreMembersCopy = { en: "See more", es: "Ver más", fr: "Voir plus", sv: "Visa fler" }[language];

  const { data: dailySpark } = useQuery<any>({
    queryKey: ["/api/daily-spark"],
    staleTime: 1000 * 60 * 5,
  });

  const { data: premiumStatus } = useQuery<{
    isPremium: boolean; remainingLikes: number; canLike: boolean;
  }>({ queryKey: ["/api/premium/status"], staleTime: 1000 * 60 });
  
  const imagePreloader = useRef<ReturnType<typeof createDiscoveryPreloader> | null>(null);
  if (!imagePreloader.current) imagePreloader.current = createDiscoveryPreloader();
  // Prioritize the current photo and avoid repeating adjacent preloads.
  useEffect(() => {
    imagePreloader.current?.warm(discoveryPreloadUrls(activeUsers ?? []));
  }, [activeUsers]);
  useEffect(() => () => imagePreloader.current?.clear(), []);
  const [localPrefs, setLocalPrefs] = useState({
    minAge: 18,
    maxAge: 50,
    maxDistance: 50,
    showMe: 'everyone'
  });

  const { data: preferences } = useQuery<{ minAge?: number | null; maxAge?: number | null; maxDistance?: number | null; showMe?: string | null }>({
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
    mutationFn: ({ targetUserId, type, amount }: { targetUserId: string; type: "free" | "paid"; amount?: number }) =>
      apiRequest('POST', `/api/proactive-help/${targetUserId}`, { type, amount }),
    onSuccess: () => {
      toast({ title: t.discover.alerts.helpSent, description: t.discover.alerts.helpSentDescription });
      setShowHelpDialog(false);
      setHelpType(null);
      setHelpAmount("");
    },
    onError: () => toast({ title: t.common.error, description: t.discover.alerts.helpError, variant: "destructive" }),
  });

  const superLikeMutation = useMutation({
    mutationFn: async ({ toUserId, userId }: { toUserId: string; userId: string }) => {
      const res = await apiRequest('POST', '/api/super-likes', { toUserId });
      return { ...(await res.json()), userId };
    },
    onSuccess: (data) => {
      refetchSuperLike();
      removedMemberIds.current.add(data.userId);
      setActiveUsers((prev) => prev?.filter((u) => u.id !== data.userId));
      if (data.isMatch) {
        setMatchAnimation(true);
        setTimeout(() => setMatchAnimation(false), 2000);
      }
      toast({
        title: t.discover.alerts.superLikeSent,
        description: t.discover.alerts.superLikeSentDescription,
      });
    },
    onError: () => {
      toast({
        title: t.discover.alerts.noSuperLikes,
        description: t.discover.alerts.noSuperLikesDescription,
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (users) {
      setActiveUsers(users.filter(user => !removedMemberIds.current.has(user.id)));
    }
  }, [users]);
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError && (activeUsers?.length ?? 0) <= 4 &&
        ((activeUsers?.length ?? 0) > 0 || removedMemberIds.current.size > 0)) {
      void fetchNextPage();
    }
  }, [activeUsers?.length, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  // Auth check
  if (!isAuthLoading && !currentUser) {
    window.location.href = "/auth";
    return null;
  }

  // Photo gate — must have a profile photo to discover others
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
            <h2 className="text-2xl font-bold">{t.discover.photoGate.title}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {t.discover.photoGate.description}
            </p>
          </div>

          <Button
            className="bg-amber-500 hover:bg-amber-600 w-full max-w-xs"
            onClick={() => { window.location.href = "/profile"; }}
            data-testid="button-go-to-profile"
          >
            <Camera className="w-4 h-4 mr-2" />
            {t.discover.photoGate.addButton}
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const handleSwipe = (userId: string, direction: "left" | "right") => {
    const removedUser = activeUsers?.find(user => user.id === userId);
    removedMemberIds.current.add(userId);
    setActiveUsers((prev) => prev?.filter((u) => u.id !== userId));

    const nextCount = swipeCount + 1;
    setSwipeCount(nextCount);
    if (nextCount % PROMO_EVERY === 0) {
      setShowPromoCard(true);
    }

    if (direction === "right") {
      swipeRight(userId, {
        onSuccess: (data) => {
          if (data.isMatch) {
            setMatchAnimation(true);
            setTimeout(() => setMatchAnimation(false), 2000);
          } else {
            toast({ title: connectionText.requestSent, description: connectionText.requestSentDescription });
          }
        },
        onError: (error) => {
          removedMemberIds.current.delete(userId);
          if (removedUser) {
            setActiveUsers(previous => previous?.some(user => user.id === userId) ? previous : [...(previous ?? []), removedUser]);
          }
          const status = error instanceof ConnectionError ? error.status : undefined;
          toast({
            title: connectionText.sendError,
            description: status === 429 ? connectionText.dailyLimit : status === 403 ? connectionText.unavailable : connectionText.sendErrorDescription,
            variant: "destructive",
          });
        },
      });
    }
  };

  if (isAuthLoading || isUsersLoading) {
    return (
      <div className="relative h-screen w-full overflow-hidden bg-background">
        <TravelLoading className="absolute inset-0" label={t.common.loading} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden pb-20">
      {/* Header */}
      <div className="px-3 sm:px-6 py-4 flex items-center justify-between gap-2">
        <h1 className="text-2xl sm:text-3xl font-display font-black"><span className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 bg-clip-text text-transparent">Fallon</span><span className="text-foreground">You</span></h1>
        <div className="flex items-center gap-2">
          <Sheet open={showPhotoMembers} onOpenChange={setShowPhotoMembers}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full text-xs px-2 sm:px-2.5" aria-label={t.discover.photosAria} data-testid="button-all-photo-members">
                <Camera className="w-4 h-4 mr-1" />
                <span className="sm:hidden">{t.discover.photos}</span><span className="hidden sm:inline">{t.discover.photosAll}</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <SheetHeader>
                <SheetTitle>{t.discover.memberSheet.title}{photoMembers ? ` (${photoMembers.length})` : ""}</SheetTitle>
              </SheetHeader>
              {isPhotoMembersLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : photoMembersError && !photoMembers?.length ? (
                <div className="py-8 text-center">
                  <p>{t.discover.memberSheet.loadError}</p>
                  <Button variant="outline" className="mt-3" onClick={() => refetchPhotoMembers()}>{t.discover.memberSheet.retry}</Button>
                </div>
              ) : !photoMembers?.length ? (
                <p className="py-8 text-center text-muted-foreground">{t.discover.memberSheet.empty}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 mt-6" data-testid="photo-members-grid">
                  {photoMembers.map(member => (
                    <div key={member.id} className="overflow-hidden rounded-2xl border bg-card">
                      <button
                        type="button"
                        onClick={() => setPublicProfileUserId(member.id)}
                        aria-label={profileCopy.viewProfileFor.replace("{name}", member.firstName || t.discover.memberSheet.unknownMember)}
                        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-inset"
                        data-testid={`button-view-member-${member.id}`}
                      >
                        <img
                          src={member.photoUrl}
                          alt={t.discover.memberSheet.photoAlt.replace("{name}", member.firstName || t.discover.memberSheet.unknownMember)}
                          loading="lazy"
                          decoding="async"
                          className="w-full aspect-[4/5] object-cover"
                        />
                        <div className="p-2.5 pb-1">
                          <p className="font-semibold truncate">{member.firstName || t.discover.memberSheet.unknownMember}{member.age ? `, ${member.age}` : ""}</p>
                          {member.currentCity && <p className="text-xs text-muted-foreground truncate">{member.currentCity}</p>}
                          <span className="mt-1 inline-block text-xs font-semibold text-amber-600 dark:text-amber-400">{profileCopy.viewProfile}</span>
                        </div>
                      </button>
                      <div className="px-2.5 pb-2.5">
                        {member.nextAdventure?.trim() && (
                          <p className="text-sm mt-2 text-foreground line-clamp-3 break-words">
                            <Plane className="w-3.5 h-3.5 inline mr-1 text-amber-500" aria-hidden="true" />
                            {member.nextAdventure}
                          </p>
                        )}
                        {!!(member.favoriteDestinations?.length || member.notRecommendedDestinations?.length) && (
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer text-amber-600 dark:text-amber-400 font-semibold">{t.profile.destinationRecommendations}</summary>
                            {!!member.favoriteDestinations?.length && (
                              <div className="mt-2 break-words">
                                <p className="font-semibold">{t.profile.favoriteDestinations}</p>
                                <p>{member.favoriteDestinations.join(", ")}</p>
                              </div>
                            )}
                            {!!member.notRecommendedDestinations?.length && (
                              <div className="mt-2 break-words">
                                <p className="font-semibold">{t.profile.notRecommendedDestinations}</p>
                                <p>{member.notRecommendedDestinations.join(", ")}</p>
                              </div>
                            )}
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {photoDirectory.hasNextPage && (
                <Button
                  className="mt-4 w-full" variant="outline" data-testid="button-more-photo-members"
                  disabled={photoDirectory.isFetchingNextPage}
                  onClick={() => void photoDirectory.fetchNextPage()}
                >{photoDirectory.isFetchingNextPage ? t.common.loading : photoDirectory.isFetchNextPageError ? t.common.retry : moreMembersCopy}</Button>
              )}
            </SheetContent>
          </Sheet>
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
              <Plane className="w-3 h-3 fill-current" />
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
                <SheetTitle>{t.discover.filters.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-3">
                  <Label>{t.swipe.ageRange}: {localPrefs.minAge}–{localPrefs.maxAge} {t.swipe.yearsOld}</Label>
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
                  <Label>{t.swipe.maxDistance}: {localPrefs.maxDistance} {t.swipe.km}</Label>
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
                  <Label>{t.swipe.showMe}</Label>
                  <Select
                    value={localPrefs.showMe}
                    onValueChange={(value) => {
                      setLocalPrefs(prev => ({ ...prev, showMe: value }));
                      updatePreferences.mutate({ showMe: value });
                    }}
                  >
                    <SelectTrigger data-testid="select-show-me">
                      <SelectValue placeholder={t.discover.filters.selectPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">{t.swipe.everyone}</SelectItem>
                      <SelectItem value="men">{t.swipe.men}</SelectItem>
                      <SelectItem value="women">{t.swipe.women}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 p-[2px]">
             <img 
               src={currentUser?.photos?.[0]?.url || currentUser?.profileImageUrl || "/avatar-placeholder.svg"} 
               className="w-full h-full rounded-full object-cover border-2 border-white"
               alt={t.discover.profilePhoto}
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
                    ? t.discover.likesBanner.one
                    : t.discover.likesBanner.many.replace("{count}", String((likesReceived as any).count))}
                </p>
                <p className="text-white/80 text-xs">{t.discover.likesBanner.description}</p>
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
                    src={dailySpark.photos?.[0]?.url || dailySpark.profileImageUrl || "/avatar-placeholder.svg"}
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
                  <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400">⚡ {t.discover.spark.label}</span>
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
                  {t.discover.spark.view}
                </button>
                <button
                  onClick={() => setSparkDismissed(true)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
                  data-testid="button-spark-dismiss"
                  aria-label={t.discover.spark.dismiss}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 24h countdown */}
            <div className="px-3 pb-2 -mt-1">
              <p className="text-[10px] text-amber-400/60 text-right">{t.discover.spark.renews}</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Reto semanal ──────────────────────────────────────────────────── */}
      {(() => {
        const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
        const challenges = [
          { emoji: "🗣️", text: t.discover.weeklyChallenges[0] },
          { emoji: "📸", text: t.discover.weeklyChallenges[1] },
          { emoji: "🗺️", text: t.discover.weeklyChallenges[2] },
          { emoji: "🎉", text: t.discover.weeklyChallenges[3] },
          { emoji: "⚡", text: t.discover.weeklyChallenges[4] },
          { emoji: "🌍", text: t.discover.weeklyChallenges[5] },
          { emoji: "✍️", text: t.discover.weeklyChallenges[6] },
          { emoji: "🤝", text: t.discover.weeklyChallenges[7] },
        ];
        const challenge = challenges[weekNum % challenges.length];
        return (
          <div className="px-4 mb-3">
            <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-950/30 via-black/40 to-amber-950/30 p-3 flex items-center gap-3" data-testid="card-weekly-challenge">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl shrink-0">
                {challenge.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold tracking-widest uppercase text-amber-500 mb-0.5">⚡ {t.engagement.weeklyChallenge}</p>
                <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{challenge.text}</p>
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
              <p className="text-white font-bold text-xl mb-1">{t.discover.likesLimit.title}</p>
              <p className="text-amber-300/70 text-sm leading-relaxed">{t.discover.likesLimit.description}</p>
            </div>
            <Button
              className="w-full font-bold py-5 rounded-2xl"
              style={{ background: "linear-gradient(90deg,#FCD34D,#F59E0B)", color: "#000" }}
              onClick={() => navigate("/premium")}
              data-testid="button-get-premium-from-wall"
            >
              <Crown className="w-5 h-5 mr-2" />
              {t.discover.likesLimit.premiumButton}
            </Button>
            <p className="text-amber-400/50 text-xs">{t.discover.likesLimit.offerTerms}</p>
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

          {!showPromoCard && activeUsers && activeUsers.length > 0 ? (() => {
            // The feed is ordered oldest-to-newest; only its last entry is current.
            const user = activeUsers[activeUsers.length - 1];
            const photoUrl = user.photos?.[0]?.url || user.profileImageUrl || "no-photo";
            return (
              <div key={`${user.id}:${photoUrl}`} className="absolute inset-x-4 inset-y-0">
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
          })() : !showPromoCard && isFetchingNextPage ? (
            <div className="relative h-full rounded-3xl overflow-hidden bg-card">
              <TravelLoading label={t.common.loading} />
            </div>
          ) : !showPromoCard ? (
             <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-card rounded-3xl border border-dashed">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold">{t.discover.emptyState.title}</h3>
                <p className="text-muted-foreground mt-2 mb-6">{t.discover.emptyState.description}</p>
                <Button onClick={() => hasNextPage ? void fetchNextPage() : void refetch()} variant="outline" data-testid="button-refresh">
                  {t.common.retry}
                </Button>
             </div>
          ) : null}
        </AnimatePresence>
      </div>
      )}

      {/* Action Buttons */}
      {(!premiumStatus || premiumStatus.isPremium || premiumStatus.canLike) && !showPromoCard && activeUsers && activeUsers.length > 0 && (
        <div className="flex justify-center items-center gap-4 mt-4 px-4">
          {/* Pass */}
          <button
            className="flex flex-col items-center gap-1 group"
            onClick={() => {
              const topUser = activeUsers[activeUsers.length - 1];
              if (topUser) handleSwipe(topUser.id, 'left');
            }}
            data-testid="button-pass"
            aria-label={connectionText.skip}
          >
            <div className="w-14 h-14 rounded-full border-2 border-border bg-card flex items-center justify-center text-muted-foreground group-hover:border-foreground/30 group-hover:scale-110 transition-all shadow-sm">
              <X className="w-6 h-6" strokeWidth={2} />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">{connectionText.skip}</span>
          </button>

          {/* Super Like / Destacar */}
          <button
            className="flex flex-col items-center gap-1 group"
            onClick={() => {
              const topUser = activeUsers[activeUsers.length - 1];
              if (topUser) {
                superLikeMutation.mutate({ toUserId: topUser.id.toString(), userId: topUser.id });
              }
            }}
            disabled={!(superLikeStatus as any)?.canSuperLike || superLikeMutation.isPending}
            data-testid="button-super-like"
          >
            <div className="w-14 h-14 rounded-full border-2 border-amber-300/50 bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500/20 group-hover:scale-110 transition-all shadow-sm disabled:opacity-40">
              <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
            </div>
            <span className="text-[10px] text-amber-500 font-medium">{t.swipe.superLike}</span>
          </button>

          {/* Connect — main CTA */}
          <button
            className="flex flex-col items-center gap-1 group"
            onClick={() => {
              const topUser = activeUsers[activeUsers.length - 1];
              if (topUser) handleSwipe(topUser.id, 'right');
            }}
            data-testid="button-like"
            aria-label={connectionText.connect}
          >
            <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-900/30 group-hover:bg-amber-400 group-hover:scale-110 transition-all">
              <Plane className="w-7 h-7" />
            </div>
            <span className="text-[10px] text-amber-600 font-bold">{t.discover.actions.connect}</span>
          </button>
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
                setHelpTargetName(topUser.firstName || t.discover.help.fallbackName);
                setHelpType(null);
                setHelpAmount("");
                setShowHelpDialog(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-muted-foreground border border-border hover:border-emerald-500/50 hover:text-emerald-600 hover:bg-emerald-500/5 transition-all"
            data-testid="button-can-help"
          >
            <HandHeart className="w-4 h-4" />
            {t.discover.actions.helpButton}
          </button>
        </div>
      )}

      {/* Help offer dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{t.discover.help.title.replace("{name}", helpTargetName)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">{t.discover.help.prompt}</p>

            {/* Free option */}
            <button
              onClick={() => setHelpType("free")}
              className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${helpType === "free" ? "border-emerald-500 bg-emerald-500/5" : "border-border hover:border-emerald-500/40"}`}
              data-testid="help-option-free"
            >
              <span className="text-2xl">🤝</span>
              <div>
                <p className="font-semibold text-sm">{t.discover.help.freeTitle}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.discover.help.freeDescription}</p>
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
                <p className="font-semibold text-sm">{t.discover.help.paidTitle}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.discover.help.paidDescription}</p>
              </div>
            </button>

            {/* Amount input for paid */}
            {helpType === "paid" && (
              <div className="relative mt-1">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="1"
                  placeholder={t.discover.help.amountPlaceholder}
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
              {t.discover.help.cancel}
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
              {proactiveHelpMutation.isPending ? t.discover.help.sending : t.discover.help.send}
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
            data-testid="match-animation"
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
                {t.discover.matchTitle}
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/80 text-lg mt-4"
              >
                {connectionText.matchDescription}
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
        hasPrev={!!activeUsers && activeUsers.findIndex(u => u.id === selectedUser?.id) < activeUsers.length - 1}
        hasNext={!!activeUsers && activeUsers.findIndex(u => u.id === selectedUser?.id) > 0}
        onPrev={() => {
          if (!activeUsers || !selectedUser) return;
          const idx = activeUsers.findIndex(u => u.id === selectedUser.id);
          if (idx < activeUsers.length - 1) setSelectedUser(activeUsers[idx + 1]);
        }}
        onNext={() => {
          if (!activeUsers || !selectedUser) return;
          const idx = activeUsers.findIndex(u => u.id === selectedUser.id);
          if (idx > 0) setSelectedUser(activeUsers[idx - 1]);
        }}
      />
      <PublicProfileViewer
        key={publicProfileUserId}
        userId={publicProfileUserId}
        open={!!publicProfileUserId}
        onOpenChange={(open) => { if (!open) setPublicProfileUserId(null); }}
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
