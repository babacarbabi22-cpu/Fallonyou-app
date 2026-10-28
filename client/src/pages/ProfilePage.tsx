import { useCurrentUser, useUpdateProfile, useDeletePhoto, UserWithPhotos } from "@/hooks/use-danceme";
import { ProfileDetailSheet } from "@/components/ProfileDetailSheet";
import { PrivateConnectionsSummary } from "@/components/PrivateConnectionsSummary";
import { DestinationListEditor } from "@/components/DestinationListEditor";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { useContentUploadConsent } from "@/components/ContentUploadConsent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, LogOut, Shield, User, Star, Plane, MapPin, Users, Trash2, FileText, Mail, Briefcase, Eye, Sparkles, Lightbulb, ChevronRight, Flame, Trophy, Zap, Smartphone, ChevronDown, Share2, Download, Bell, BellOff, Languages, HandHeart, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { PersonalPreferencesConsent } from "@/components/PersonalPreferencesConsent";
import { personalPreferencesCopy } from "@/lib/personal-preferences-copy";
import { hasPersonalPreferencesConsent, PERSONAL_PREFERENCES_CONSENT_VERSION } from "@shared/personal-preferences-consent";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useI18n, useTranslation } from "@/lib/i18n";
import { MessageEmailPreference } from "@/components/MessageEmailPreference";
import { contentLicenseCopy } from "@/lib/content-license";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VerificationStatus } from "@/components/VerificationBadge";
import { NotificationToggle } from "@/components/NotificationToggle";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { profilePageCopy, type ProfileBadgeId, type ProfileHelpCategoryId } from "@/lib/language-profile-copy";
import { engagementCopy } from "@shared/engagement-copy";

export default function ProfilePage() {
  const { data: user, isLoading, isError, refetch } = useCurrentUser();
  const { logout } = useAuth();
  const t = useTranslation();
  const { language } = useI18n();
  const pageCopy = profilePageCopy[language];
  const personalCopy = personalPreferencesCopy[language];
  const engagement = engagementCopy[language];
  const reminderDelivery = {
    en: "Optional delivery: in-app and email to your verified address; push only when configured.",
    es: "Entrega opcional: en la app y por correo a tu dirección verificada; notificaciones push solo si están configuradas.",
    fr: "Envoi facultatif : dans l’application et par e-mail à votre adresse vérifiée ; notifications push uniquement si elles sont configurées.",
    sv: "Valfri leverans: i appen och via e-post till din verifierade adress; pushnotiser endast om de är konfigurerade.",
  }[language];
  const [personalConsentWanted, setPersonalConsentWanted] = useState(false);
  const personalConsentGranted = hasPersonalPreferencesConsent(user?.profile);
  const getBadgeCopy = (id: string) => id in pageCopy.badges
    ? pageCopy.badges[id as ProfileBadgeId]
    : pageCopy.badgeUnknown;
  const license = contentLicenseCopy[language];
  const { toast } = useToast();
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();
  const { mutate: deletePhoto } = useDeletePhoto();

  const { data: streakData } = useQuery<{ streak: number; longestStreak: number }>({
    queryKey: ["/api/streak"],
    enabled: !!user,
  });
  const { data: viewsToday } = useQuery<{ count: number }>({
    queryKey: ["/api/profile-views/today"],
    enabled: !!user,
  });
  const { data: badges, isLoading: isBadgesLoading, isError: isBadgesError } = useQuery<{ id: string; icon: string; label: string; description: string; earned: boolean }[]>({
    queryKey: ["/api/my-badges"],
    enabled: !!user,
  });

  const { data: langLevelData } = useQuery<{ level: string | null; levelLabel: string | null; language: string | null }>({
    queryKey: ["/api/language/my-level"],
    enabled: !!user,
  });

  const LANG_LEVEL_META: Record<string, { color: string; bg: string; emoji: string }> = {
    a1:     { color: "text-green-700 dark:text-green-400", bg: "bg-green-500/15 border-green-500/30",  emoji: "🌱" },
    a2:     { color: "text-blue-700 dark:text-blue-400",   bg: "bg-blue-500/15 border-blue-500/30",    emoji: "✈️" },
    b1:     { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/15 border-amber-500/30",  emoji: "🗣️" },
    b2plus: { color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30", emoji: "🏆" },
    c1: { color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-500/15 border-rose-500/30", emoji: "" },
    c2: { color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-500/15 border-indigo-500/30", emoji: "" },
  };
  const LANG_FLAGS: Record<string, string> = { en: "🇬🇧", es: "🇪🇸", fr: "🇫🇷", it: "🇮🇹", pt: "🇧🇷", de: "🇩🇪", ja: "🇯🇵", zh: "🇨🇳", ar: "🇸🇦", nl: "🇳🇱", sv: "🇸🇪" };

  const { uploadFile, isUploading } = useUpload({
    onSuccess: async (response) => {
      await fetch(api.photos.upload.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: response.objectPath, type: "image" }),
        credentials: "include",
      });
      window.location.reload();
    },
  });
  const requestConsent = useContentUploadConsent();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formState, setFormState] = useState({
    displayName: "",
    bio: "",
    age: "",
    showAge: false,
    gender: "",
    preference: "",
    occupation: "",
    birthplace: "",
    nextAdventure: "",
    favoriteDestinations: [] as string[],
    notRecommendedDestinations: [] as string[],
  });
  const [ageTouched, setAgeTouched] = useState(false);
  const parsedAge = Number(formState.age);
  const ageInvalid = formState.age.trim() === "" || !Number.isInteger(parsedAge) || parsedAge < 18 || parsedAge > 100;

  // Must be before any conditional returns
  const [isSettingProfilePic, setIsSettingProfilePic] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showNotifPrefs, setShowNotifPrefs] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;

  type NotifPrefs = { profileViews: boolean; newTravelers: boolean; matches: boolean; messages: boolean; events: boolean; learningReminders: boolean; interfaceLanguage?: string };
  const { data: notifPrefs, isError: notifPrefsError, refetch: refetchNotifPrefs } = useQuery<NotifPrefs>({
    queryKey: ["/api/notifications/preferences"],
    enabled: !!user,
  });
  const notifPrefsMutation = useMutation({
    mutationFn: async (patch: Partial<NotifPrefs>) =>
      (await apiRequest("PATCH", "/api/notifications/preferences", patch)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications/preferences"] }),
    onError: () => toast({ title: t.common.error, variant: "destructive" }),
  });

  const { mutate: toggleGuide, isPending: isTogglingGuide } = useMutation({
    mutationFn: async (active: boolean) => {
      const res = await fetch("/api/profile/guide-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availableAsGuide: active }),
        credentials: "include",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });

  const { mutate: toggleAvailability, isPending: isTogglingAvailability } = useMutation({
    mutationFn: async (available: boolean) => {
      const res = await fetch("/api/profile/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availableToday: available }),
        credentials: "include",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });

  const { mutate: saveAviation, isPending: isSavingAviation } = useMutation({
    mutationFn: async (patch: { aviationOptIn: boolean; aviationRole: string | null }) => {
      const response = await fetch("/api/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error("Unable to save aviation settings");
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.auth.me.path] }),
    onError: () => toast({ title: t.common.error, description: (t as any).layovers.saveError, variant: "destructive" }),
  });

  const HELP_CATEGORIES: { id: ProfileHelpCategoryId }[] = [
    { id: "idiomas" },
    { id: "alojamiento" },
    { id: "guia_local" },
    { id: "trabajo" },
    { id: "estudios" },
    { id: "tecnologia" },
    { id: "restaurantes" },
    { id: "integracion" },
    { id: "donaciones" },
    { id: "transporte" },
    { id: "salud" },
    { id: "finanzas" },
  ];

  const [localHelpWith, setLocalHelpWith] = useState<string[]>([]);

  const { mutate: saveHelpSettings, isPending: isSavingHelp } = useMutation({
    mutationFn: async ({ wantToHelp, helpWith }: { wantToHelp: boolean; helpWith: string[] }) => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ wantToHelp, helpWith }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });

  useEffect(() => {
    if (user) {
      setFormState({
        displayName: user.displayName || user.firstName || "",
        bio: user.bio || user.profile?.bio || "",
        age: String(user.age ?? user.profile?.age ?? ""),
        showAge: (user.profile as any)?.showAge === true,
        gender: user.gender || user.profile?.gender || "",
        preference: user.preference || user.profile?.preference || "",
        occupation: user.profile?.occupation || "",
        birthplace: user.profile?.birthplace || "",
        nextAdventure: (user.profile as any)?.nextAdventure || "",
        favoriteDestinations: user.profile?.favoriteDestinations || [],
        notRecommendedDestinations: user.profile?.notRecommendedDestinations || [],
      });
      setLocalHelpWith((user.profile as any)?.helpWith || []);
    }
  }, [user]);

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <Loader2 className="animate-spin text-primary w-8 h-8" />
      <span className="text-sm text-muted-foreground">{pageCopy.loading}</span>
    </div>
  );
  if (isError) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6 text-center" role="alert">
      <p className="text-sm text-muted-foreground">{pageCopy.loadError}</p>
      <Button variant="outline" onClick={() => refetch()}>{pageCopy.retry}</Button>
    </div>
  );
  if (!user) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 text-center">
      <p className="text-sm text-muted-foreground">{pageCopy.unavailable}</p>
    </div>
  );

  const handleSave = () => {
    setAgeTouched(true);
    if (ageInvalid) return;
    if (["men", "women", "both"].includes(formState.preference) && !personalConsentGranted && !personalConsentWanted) {
      toast({ title: personalCopy.required, variant: "destructive" });
      return;
    }
    updateProfile({ ...formState, age: parsedAge, showAge: formState.showAge, ...(personalConsentWanted ? {
      personalPreferencesConsent: true, personalPreferencesConsentVersion: PERSONAL_PREFERENCES_CONSENT_VERSION,
    } : {}) }, {
      onSuccess: () => {
        setPersonalConsentWanted(false);
        toast({
          title: t.profile.saved,
          description: t.profile.savedDescription,
        });
      },
      onError: () => {
        toast({
          title: t.common.error,
          description: pageCopy.saveError,
          variant: "destructive",
        });
      },
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
  };

  const setAsProfilePicture = async (photoUrl: string) => {
    if (!(await requestConsent())) return;
    setIsSettingProfilePic(true);
    try {
      const res = await fetch("/api/profile-image", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: photoUrl }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Unable to set profile photo");
      if (res.ok) {
        toast({
          title: t.profile.profilePhotoSet,
          description: t.profile.profilePhotoSetDescription,
        });
        queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      }
    } catch {
      toast({ title: t.common.error, description: pageCopy.photoError, variant: "destructive" });
    } finally {
      setIsSettingProfilePic(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* Header banner */}
      <div className="relative h-52 bg-gradient-to-br from-zinc-900 via-black to-zinc-800">

        {/* Scattered background particles */}
        <div className="absolute inset-0 pointer-events-none">
          <Plane  className="absolute text-amber-400 fill-amber-400 w-4 h-4 animate-slowblink"   style={{ top: '12%', left:  '6%' }} />
          <Star   className="absolute text-yellow-400 fill-yellow-400 w-3 h-3 animate-slowblink-1" style={{ top: '18%', left: '18%' }} />
          <Plane  className="absolute text-amber-300 fill-amber-300 w-3 h-3 animate-slowblink-2" style={{ top:  '8%', left: '32%' }} />
          <Star   className="absolute text-amber-500 fill-amber-500 w-4 h-4 animate-slowblink-3" style={{ top: '22%', left: '50%' }} />
          <Plane  className="absolute text-yellow-300 fill-yellow-300 w-3 h-3 animate-slowblink-4" style={{ top:  '9%', left: '65%' }} />
          <Star   className="absolute text-amber-400 fill-amber-400 w-4 h-4 animate-slowblink-5" style={{ top: '20%', left: '80%' }} />
          <Plane  className="absolute text-amber-300 fill-amber-300 w-3 h-3 animate-slowblink-6" style={{ top: '15%', left: '92%' }} />
          <Star   className="absolute text-yellow-500 fill-yellow-500 w-3 h-3 animate-slowblink-7" style={{ top: '62%', left:  '3%' }} />
          <Plane  className="absolute text-amber-400 fill-amber-400 w-5 h-5 animate-slowblink-3" style={{ top: '70%', left: '22%' }} />
          <Star   className="absolute text-amber-300 fill-amber-300 w-3 h-3 animate-slowblink-1" style={{ top: '55%', left: '42%' }} />
          <Plane  className="absolute text-yellow-400 fill-yellow-400 w-3 h-3 animate-slowblink-5" style={{ top: '75%', left: '60%' }} />
          <Star   className="absolute text-amber-500 fill-amber-500 w-4 h-4 animate-slowblink-2" style={{ top: '58%', left: '76%' }} />
          <Plane  className="absolute text-amber-300 fill-amber-300 w-3 h-3 animate-slowblink-6" style={{ top: '68%', left: '90%' }} />
          <Sparkles className="absolute text-yellow-300 fill-yellow-300 w-4 h-4 animate-slowblink-4" style={{ top: '35%', left: '12%' }} />
          <Sparkles className="absolute text-amber-400 fill-amber-400 w-3 h-3 animate-slowblink-7" style={{ top: '40%', left: '87%' }} />
        </div>

        {/* Name + icons row */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3">
            <Star className="w-9 h-9 text-amber-400 fill-amber-400 animate-twinkle" />
            <Plane className="w-9 h-9 text-amber-400 fill-amber-400 animate-twinkle-delay-1 -rotate-45" />
            <span
              className="font-black uppercase tracking-[0.2em] animate-goldglow select-none"
              style={{
                fontSize: "clamp(1.6rem, 6vw, 2.4rem)",
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontStyle: "italic",
                background: "linear-gradient(135deg, #fde68a 0%, #f59e0b 35%, #fbbf24 60%, #fde68a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "0.22em",
              }}
            >
              {formState.displayName || user.firstName || pageCopy.you}
            </span>
            <Plane className="w-9 h-9 text-amber-400 fill-amber-400 animate-twinkle-delay-2 rotate-45" />
            <Star className="w-9 h-9 text-amber-400 fill-amber-400 animate-twinkle-delay-3" />
          </div>
        </div>

        {/* Gold accent line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

        {/* Profile photo */}
        <div className="absolute -bottom-12 left-6">
          <div className="relative w-24 h-24">
            <div className="absolute -inset-1.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full animate-ringpulse" />
            <img
              src={user.profileImageUrl || user.photos?.[0]?.url || "/avatar-placeholder.svg"}
              className="relative w-full h-full rounded-full object-cover border-3 border-background shadow-lg"
              alt={pageCopy.profilePhotoAlt}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg z-10 hover:scale-110 transition-transform"
              data-testid="button-upload-photo"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              data-testid="input-file-upload"
            />
          </div>
        </div>

        {/* Top-right actions */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <ThemeToggle />
          <LanguageSelector />
          <Button
            variant="destructive"
            size="sm"
            onClick={() => logout(undefined, {
              onError: (error) => toast({ title: error.message, variant: "destructive" }),
            })}
            className="rounded-full shadow-lg"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            {t.profile.logout}
          </Button>
        </div>
      </div>

      <div className="mt-20 px-4 space-y-6">

        {/* Profile completion bar */}
        {(() => {
          const checks = [
             { done: !!(user.profileImageUrl || user.photos?.[0]?.url), label: t.ui.profilePhoto },
             { done: !!formState.displayName, label: t.ui.profileName },
            { done: !!formState.bio, label: pageCopy.bioCompletion },
             { done: !ageInvalid, label: t.ui.profileAge },
             { done: (user.photos?.length ?? 0) >= 3, label: t.ui.profileThreePhotos },
          ];
          const completed = checks.filter(c => c.done).length;
          const pct = Math.round((completed / checks.length) * 100);
          if (pct === 100) return null;
          const missing = checks.filter(c => !c.done).map(c => c.label);
          return (
            <div className="bg-card border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold">{t.ui.profileComplete.replace("{n}", String(pct))}</span>
                </div>
                <span className="text-xs text-muted-foreground">{completed}/{checks.length}</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: pct < 40 ? '#ef4444' : pct < 70 ? '#f59e0b' : '#22c55e',
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                 {t.ui.profileMissing} <span className="text-foreground font-medium">{missing.join(', ')}</span>
              </p>
              <p className="text-xs text-amber-600 mt-1 font-medium">
                 {t.ui.profileCompleteHint}
              </p>
            </div>
          );
        })()}

        {/* ── Racha + Vistas hoy ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Racha de conexión */}
          <div
            className="bg-card border rounded-2xl p-4 shadow-sm relative overflow-hidden"
            data-testid="card-streak"
          >
            <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full bg-amber-500/10" />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1">
                <Flame className="w-4 h-4 text-amber-500" />
                 <span className="text-xs font-semibold text-muted-foreground">{t.ui.profileStreak}</span>
              </div>
              <p className="text-3xl font-black text-amber-500 leading-none">
                {streakData?.streak ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                 {streakData?.streak === 1 ? t.ui.profileDay : t.ui.profileDays}
              </p>
              {(streakData?.longestStreak ?? 0) > 0 && (
                <p className="text-[10px] text-amber-400/70 mt-0.5">
                   {t.ui.profileRecord}: {streakData!.longestStreak}d
                </p>
              )}
            </div>
          </div>

          {/* Vistas hoy */}
          <div
            className="bg-card border rounded-2xl p-4 shadow-sm relative overflow-hidden"
            data-testid="card-views-today"
          >
            <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full bg-blue-500/10" />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1">
                <Eye className="w-4 h-4 text-blue-500" />
                 <span className="text-xs font-semibold text-muted-foreground">{t.ui.profileViews}</span>
              </div>
              <p className="text-3xl font-black text-blue-500 leading-none">
                {viewsToday?.count ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                 {(viewsToday?.count ?? 0) === 1 ? t.ui.profilePeople : t.ui.profilePeoplePlural}
              </p>
               <p className="text-[10px] text-blue-400/70 mt-0.5">{t.ui.profileViewed}</p>
            </div>
          </div>
        </div>

        {/* ── Nivel de idioma ───────────────────────────────────────────────── */}
        {langLevelData?.level && (() => {
          const meta = LANG_LEVEL_META[langLevelData.level] ?? LANG_LEVEL_META.a1;
          const flag = LANG_FLAGS[langLevelData.language ?? ""] ?? "🌐";
          return (
            <div
              className={`rounded-2xl border p-4 shadow-sm flex items-center gap-3 ${meta.bg}`}
              data-testid="card-language-level"
            >
              <div className="w-11 h-11 rounded-2xl bg-white/20 dark:bg-black/20 flex items-center justify-center text-xl shrink-0">
                {meta.emoji || <Trophy className={`h-6 w-6 ${meta.color}`} aria-hidden="true" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-black text-lg ${meta.color}`}>{langLevelData.levelLabel}</span>
                   <span className="text-sm font-semibold">{t.ui.profileLanguageLevel}</span>
                  <span className="text-base">{flag}</span>
                </div>
                  <p className="text-xs text-muted-foreground">{t.ui.profilePracticeLanguages}</p>
              </div>
            </div>
          );
        })()}

        {/* ── Insignias / Logros ──────────────────────────────────────────── */}
        {(isBadgesLoading || isBadgesError || badges) && (
          <div className="bg-card border rounded-2xl p-4 shadow-sm" data-testid="section-badges">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-500" />
               <span className="text-sm font-bold">{t.ui.profileAchievements}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {badges ? `${badges.filter(b => b.earned).length}/${badges.length}` : ""}
              </span>
            </div>
            {isBadgesLoading ? (
              <p className="text-sm text-muted-foreground" role="status">{pageCopy.badgesLoading}</p>
            ) : isBadgesError ? (
              <p className="text-sm text-muted-foreground" role="alert">{pageCopy.badgesError}</p>
            ) : badges?.length ? (
              <div className="grid grid-cols-5 gap-2">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    title={badge.earned
                    ? getBadgeCopy(badge.id).description
                    : `🔒 ${getBadgeCopy(badge.id).description}`}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${badge.earned ? "opacity-100" : "opacity-30 grayscale"}`}
                    data-testid={`badge-${badge.id}`}
                  >
                    <span className="text-2xl">{badge.icon}</span>
                    <span className="text-[9px] font-semibold text-center leading-tight text-foreground" style={{ maxWidth: "48px" }}>
                      {getBadgeCopy(badge.id).label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{pageCopy.badgesEmpty}</p>
            )}
          </div>
        )}

        {/* ── Estoy disponible hoy ─────────────────────────────────────────── */}
        {(() => {
          const isAvailable = !!(user.profile as any)?.availableToday;
          return (
            <div
              className={`rounded-2xl border p-4 shadow-sm flex items-center gap-4 transition-all ${isAvailable ? "border-green-500/40 bg-green-500/5" : "border-border bg-card"}`}
              data-testid="card-available-today"
            >
              <div className={`relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isAvailable ? "bg-green-500/20" : "bg-muted"}`}>
                {isAvailable && (
                  <span className="absolute inset-0 rounded-full bg-green-400/30 animate-ping" />
                )}
                <Zap className={`w-6 h-6 ${isAvailable ? "text-green-500 fill-green-500" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{t.engagement.availableToday}</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  {isAvailable ? t.engagement.availableActive : t.engagement.availableInactive}
                </p>
              </div>
              <button
                onClick={() => toggleAvailability(!isAvailable)}
                disabled={isTogglingAvailability}
                data-testid="toggle-available-today"
                className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${isAvailable ? "bg-green-500" : "bg-muted-foreground/30"} ${isTogglingAvailability ? "opacity-60" : ""}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${isAvailable ? "left-6" : "left-0.5"}`} />
              </button>
            </div>
          );
        })()}

        {/* ── Mi escala / aviation opt-in ─────────────────────────────────── */}
        {(() => {
          const aviation = !!(user.profile as any)?.aviationOptIn;
          const role = (user.profile as any)?.aviationRole || "";
          const layovers = (t as any).layovers;
          const roles = ["cabin_crew", "pilot", "airport_staff", "dispatcher", "maintenance", "other"];
          return (
            <div className={`rounded-2xl border p-4 shadow-sm ${aviation ? "border-sky-500/40 bg-sky-500/5" : "bg-card"}`} data-testid="card-aviation-layovers">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${aviation ? "bg-sky-500/20" : "bg-muted"}`}><Plane className={`w-6 h-6 ${aviation ? "text-sky-600" : "text-muted-foreground"}`} /></div>
                <div className="flex-1"><p className="font-bold text-sm">{layovers.title}</p><p className="text-xs text-muted-foreground">{layovers.subtitle}</p></div>
                <button onClick={() => saveAviation({ aviationOptIn: !aviation, aviationRole: !aviation ? (role || "other") : null })} disabled={isSavingAviation} className={`relative w-12 h-6 rounded-full ${aviation ? "bg-sky-500" : "bg-muted-foreground/30"}`} aria-label={layovers.title}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${aviation ? "left-6" : "left-0.5"}`} />
                </button>
              </div>
              {aviation && <div className="mt-3 pt-3 border-t space-y-3">
                <select value={role || "other"} onChange={e => saveAviation({ aviationOptIn: true, aviationRole: e.target.value })} className="w-full rounded-md border bg-background p-2 text-sm" aria-label={layovers.title}>
                  {roles.map(value => <option key={value} value={value}>{layovers.roles[value]}</option>)}
                </select>
                <p className="text-xs text-muted-foreground">{layovers.privacy}</p>
                <Link href="/layovers"><Button variant="outline" size="sm" className="w-full">{layovers.discover}</Button></Link>
              </div>}
            </div>
          );
        })()}

        {/* ── Disponible de guía ───────────────────────────────────────────── */}
        {(() => {
          const isGuide = !!(user.profile as any)?.availableAsGuide;
          return (
            <div
              className={`rounded-2xl border p-4 shadow-sm flex items-center gap-4 transition-all ${isGuide ? "border-blue-500/40 bg-blue-500/5" : "border-border bg-card"}`}
              data-testid="card-available-as-guide"
            >
              <div className={`relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isGuide ? "bg-blue-500/20" : "bg-muted"}`}>
                {isGuide && (
                  <span className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping" />
                )}
                <MapPin className={`w-6 h-6 ${isGuide ? "text-blue-500 fill-blue-100" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{t.engagement.availableAsGuide}</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  {isGuide
                    ? t.engagement.availableAsGuideActive
                    : t.engagement.availableAsGuideInactive}
                </p>
              </div>
              <button
                onClick={() => toggleGuide(!isGuide)}
                disabled={isTogglingGuide}
                data-testid="toggle-available-as-guide"
                className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${isGuide ? "bg-blue-500" : "bg-muted-foreground/30"} ${isTogglingGuide ? "opacity-60" : ""}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${isGuide ? "left-6" : "left-0.5"}`} />
              </button>
            </div>
          );
        })()}

        {/* ── Quiero ayudar a todos ────────────────────────────────────────── */}
        {(() => {
          const isHelping = !!(user.profile as any)?.wantToHelp;
          return (
            <div
              className={`rounded-2xl border p-4 shadow-sm transition-all ${isHelping ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card"}`}
              data-testid="card-want-to-help"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isHelping ? "bg-amber-500/20" : "bg-muted"}`}>
                  <HandHeart className={`w-6 h-6 ${isHelping ? "text-amber-500" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{t.ui.profileHelpAll}</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                     {isHelping ? t.ui.profileHelpActive : t.ui.profileHelpInactive}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newVal = !isHelping;
                    saveHelpSettings({ wantToHelp: newVal, helpWith: newVal ? localHelpWith : [] });
                  }}
                  disabled={isSavingHelp}
                  data-testid="toggle-want-to-help"
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${isHelping ? "bg-amber-500" : "bg-muted-foreground/30"} ${isSavingHelp ? "opacity-60" : ""}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${isHelping ? "left-6" : "left-0.5"}`} />
                </button>
              </div>

              {isHelping && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-3">{t.ui.profileHelpWith}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {HELP_CATEGORIES.map(({ id }) => {
                      const isSelected = localHelpWith.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            const updated = isSelected
                              ? localHelpWith.filter(x => x !== id)
                              : [...localHelpWith, id];
                            setLocalHelpWith(updated);
                            saveHelpSettings({ wantToHelp: true, helpWith: updated });
                          }}
                          data-testid={`button-help-category-${id}`}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-all ${
                            isSelected
                              ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium"
                              : "border-border bg-muted/20"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                          {pageCopy.helpCategories[id]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Estado laboral ───────────────────────────────────────────────── */}
        {(() => {
          const ws = (user.profile as any)?.workStatus as string | null | undefined;
          const isLooking = ws === "looking";
          const isOffering = ws === "offering";
          return (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm" data-testid="card-work-status">
              <p className="font-bold text-sm mb-3">{t.ui.profileWorkStatus}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    const next = isLooking ? null : "looking";
                    await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ workStatus: next }) });
                    queryClient.invalidateQueries({ queryKey: ["/api/me"] });
                  }}
                  data-testid="button-work-looking"
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${isLooking ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300" : "border-border text-muted-foreground hover:border-purple-400"}`}
                >
                  <span className="text-base">🔍</span>
                   {t.ui.profileLookingWork}
                  {isLooking && <span className="ml-auto text-purple-500 text-xs">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const next = isOffering ? null : "offering";
                    await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ workStatus: next }) });
                    queryClient.invalidateQueries({ queryKey: ["/api/me"] });
                  }}
                  data-testid="button-work-offering"
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${isOffering ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300" : "border-border text-muted-foreground hover:border-green-400"}`}
                >
                  <span className="text-base">📢</span>
                   {t.ui.profileOfferingWork}
                  {isOffering && <span className="ml-auto text-green-500 text-xs">✓</span>}
                </button>
              </div>
              {ws && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                   {isLooking ? t.ui.profileLookingWorkHint : t.ui.profileOfferingWorkHint}
                </p>
              )}
            </div>
          );
        })()}

        <PrivateConnectionsSummary userId={user.id} />

        {/* Ver perfil preview */}
        <Button
          variant="outline"
          className="w-full h-10 rounded-xl font-medium border-primary/30 text-primary hover:bg-primary/5"
          onClick={() => setShowPreview(true)}
          data-testid="button-ver-perfil"
        >
          <Eye className="w-4 h-4 mr-2" />
          {pageCopy.viewProfile}
        </Button>

        {/* Basic info form */}
        <section className="space-y-4">
          <h2 className="text-xl font-display font-bold">{t.profile.editProfile}</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t.profile.displayName}</label>
              <Input
                value={formState.displayName}
                onChange={(e) => setFormState({ ...formState, displayName: e.target.value })}
                className="rounded-xl"
                data-testid="input-display-name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t.profile.age}</label>
              <Input
                type="number"
                value={formState.age}
                onChange={(e) => setFormState({ ...formState, age: e.target.value })}
                onBlur={() => setAgeTouched(true)}
                className="rounded-xl"
                min={18}
                max={100}
                inputMode="numeric"
                aria-invalid={ageTouched && ageInvalid}
                aria-describedby={ageTouched && ageInvalid ? "profile-age-error" : undefined}
                data-testid="input-age"
              />
              {ageTouched && ageInvalid && <p id="profile-age-error" role="alert" className="text-xs text-destructive">{t.profile.ageInvalid}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3">
            <div className="min-w-0 space-y-1">
              <label htmlFor="switch-show-age" className="text-sm font-medium leading-none cursor-pointer">
                {pageCopy.showAge}
              </label>
              <p id="show-age-description" className="text-xs leading-relaxed text-muted-foreground">
                {pageCopy.showAgeDescription}
              </p>
            </div>
            <Switch
              id="switch-show-age"
              checked={formState.showAge}
              onCheckedChange={(showAge) => setFormState((previous) => ({ ...previous, showAge }))}
              aria-label={pageCopy.showAge}
              aria-describedby="show-age-description"
              data-testid="switch-show-age"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{t.profile.bio}</label>
            <Textarea
              value={formState.bio}
              onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
              className="rounded-xl min-h-[100px]"
              placeholder={pageCopy.bioPlaceholder}
              data-testid="input-bio"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t.profile.gender}</label>
              <select
                value={formState.gender}
                onChange={(e) => setFormState({ ...formState, gender: e.target.value })}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="select-gender"
              >
                <option value="">{t.profile.gender}</option>
                <option value="male">{t.profile.male}</option>
                <option value="female">{t.profile.female}</option>
                <option value="other">{t.profile.other}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t.profile.lookingFor}</label>
              <select
                value={formState.preference}
                onChange={(e) => setFormState({ ...formState, preference: e.target.value })}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="select-preference"
              >
                <option value="">{t.profile.lookingFor}</option>
                <option value="men">{t.swipe.men}</option>
                <option value="women">{t.swipe.women}</option>
                <option value="everyone">{t.swipe.everyone}</option>
              </select>
            </div>
          </div>

          <PersonalPreferencesConsent checked={personalConsentWanted} granted={personalConsentGranted} onChange={setPersonalConsentWanted} />
          {(personalConsentGranted || ["men", "women", "both"].includes(user.profile?.preference || "")) && (
            <Button type="button" variant="outline" disabled={isUpdating} data-testid="button-withdraw-personal-preferences"
              onClick={() => {
                if (!window.confirm(personalCopy.withdrawConfirm)) return;
                updateProfile({ personalPreferencesConsent: false }, { onSuccess: () => {
                  setPersonalConsentWanted(false);
                  setFormState(previous => ({ ...previous, preference: "" }));
                  queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
                } });
              }}>{personalCopy.withdraw}</Button>
          )}
          {(user.profile?.religion || user.profile?.politics || user.profile?.relationshipType) && (
            <div className="space-y-2 rounded-xl border p-3" data-testid="legacy-sensitive-profile-data">
              <p className="text-sm text-muted-foreground">{personalCopy.legacy}</p>
              <p className="text-sm break-words">{[user.profile.religion, user.profile.politics, user.profile.relationshipType].filter(Boolean).join(" · ")}</p>
              <Button type="button" variant="outline" disabled={isUpdating} data-testid="button-clear-legacy-sensitive-data"
                onClick={() => {
                  if (!window.confirm(personalCopy.clearConfirm)) return;
                  updateProfile({ religion: null, politics: null, relationshipType: null });
                }}>{personalCopy.clear}</Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                {t.profileDetails.occupation}
              </label>
              <Input
                value={formState.occupation}
                onChange={(e) => setFormState({ ...formState, occupation: e.target.value })}
                className="rounded-xl"
                placeholder={t.profileDetails.occupationPlaceholder}
                data-testid="input-occupation"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {t.profileDetails.birthplace}
              </label>
              <Input
                value={formState.birthplace}
                onChange={(e) => setFormState({ ...formState, birthplace: e.target.value })}
                className="rounded-xl"
                placeholder={t.profileDetails.birthplacePlaceholder}
                data-testid="input-birthplace"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5" />
              {t.engagement.nextAdventure}
            </label>
            <Textarea
              value={formState.nextAdventure}
              onChange={(e) => setFormState({ ...formState, nextAdventure: e.target.value })}
              className="rounded-xl min-h-20"
              maxLength={180}
              placeholder={t.engagement.nextAdventurePlaceholder}
              data-testid="input-next-adventure"
            />
            <p className="text-xs text-muted-foreground">{t.engagement.nextAdventureHint}</p>
          </div>

          <div className="space-y-4 rounded-2xl border p-4">
            <div>
              <h3 className="font-semibold">{t.profile.destinationRecommendations}</h3>
              <p className="text-xs text-muted-foreground">{t.profile.destinationOpinionHint}</p>
            </div>
            <DestinationListEditor
              label={t.profile.favoriteDestinations}
              placeholder={t.profile.favoriteDestinationPlaceholder}
              addLabel={t.profile.addDestination}
              values={formState.favoriteDestinations}
              onChange={favoriteDestinations => setFormState(previous => ({ ...previous, favoriteDestinations }))}
              testId="input-favorite-destination"
            />
            <DestinationListEditor
              label={t.profile.notRecommendedDestinations}
              placeholder={t.profile.notRecommendedDestinationPlaceholder}
              addLabel={t.profile.addDestination}
              values={formState.notRecommendedDestinations}
              onChange={notRecommendedDestinations => setFormState(previous => ({ ...previous, notRecommendedDestinations }))}
              testId="input-not-recommended-destination"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={isUpdating}
            className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
            data-testid="button-save-profile"
          >
            {isUpdating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.common.loading}</>
            ) : (
              t.profile.save
            )}
          </Button>
        </section>

        {/* Photos */}
        <section className="space-y-3">
          <h2 className="text-xl font-display font-bold">{t.profile.photos}</h2>
          {!user.photos?.length && (
            <p className="text-sm text-muted-foreground" data-testid="first-photo-reminder">
              {license.firstProfilePhotoReminder}
            </p>
          )}
          {(user.photos?.length ?? 0) > 0 && (
            <p className="text-sm text-muted-foreground">{t.profile.tapToSetProfile}</p>
          )}
          <div className="grid grid-cols-3 gap-3">
            {user.photos?.map((photo) => {
              const isProfilePic = user.profileImageUrl === photo.url;
              return (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={photo.url} className="w-full h-full object-cover" alt={pageCopy.photoAlt} />
                  {isProfilePic && (
                    <div className="absolute top-2 left-2 bg-primary text-white p-1 rounded-full">
                      <Star className="w-3 h-3 fill-current" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      onClick={() => setAsProfilePicture(photo.url)}
                      disabled={isSettingProfilePic || isProfilePic}
                      className="rounded-full w-9 h-9"
                      data-testid={`button-set-profile-${photo.id}`}
                    >
                      <User className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => {
                        if ((user.photos?.length ?? 0) <= 1) {
                          toast({ title: pageCopy.requiredPhotoTitle, description: pageCopy.requiredPhotoDescription, variant: "destructive" });
                          return;
                        }
                        deletePhoto(photo.id);
                      }}
                      className="rounded-full w-9 h-9"
                      disabled={(user.photos?.length ?? 0) <= 1}
                      data-testid={`button-delete-photo-${photo.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              data-testid="button-add-photo"
            >
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{t.profile.addPhoto}</span>
            </button>
          </div>
        </section>

        {/* Settings */}
        <section className="space-y-3">
          <h2 className="text-xl font-display font-bold">{t.settings.title}</h2>

          <VerificationStatus user={{
            isVerified: user?.isVerified,
            verificationStatus: (user as any)?.verificationStatus,
            verificationRejectedReason: (user as any)?.verificationRejectedReason,
          }} />

          <NotificationToggle />

          {/* Notification preferences */}
          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setShowNotifPrefs(v => !v)}
            data-testid="card-notif-prefs"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-sky-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{pageCopy.notificationPreferences}</p>
                  <p className="text-xs text-muted-foreground">{pageCopy.notificationDescription}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showNotifPrefs ? "rotate-180" : ""}`} />
              </div>

              {showNotifPrefs && (
                <div className="mt-4 pt-4 border-t space-y-3" onClick={e => e.stopPropagation()}>
                  {notifPrefsError && (
                    <div role="alert" className="flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">{t.common.error}</p>
                      <Button variant="outline" size="sm" onClick={() => refetchNotifPrefs()} data-testid="retry-notif-prefs">
                        {t.common.retry}
                      </Button>
                    </div>
                  )}
                  {([
                    { key: "profileViews", icon: <Eye className="w-4 h-4 text-amber-500" />, premium: true },
                    { key: "newTravelers", icon: <Plane className="w-4 h-4 text-sky-500" />, premium: true },
                    { key: "matches", icon: <Users className="w-4 h-4 text-amber-500" />, premium: false },
                    { key: "messages", icon: <Mail className="w-4 h-4 text-blue-500" />, premium: false },
                    { key: "events", icon: <Sparkles className="w-4 h-4 text-green-500" />, premium: false },
                  ] as const).map(({ key, icon, premium }) => {
                    const isPremiumUser = user?.isPremium === 'true';
                    const locked = premium && !isPremiumUser;
                    const enabled = !locked && !!notifPrefs && notifPrefs[key] !== false;
                    return (
                      <div key={key} className={`flex items-center justify-between gap-3 ${locked ? "opacity-60" : ""}`} data-testid={`notif-pref-${key}`}>
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">{icon}</div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium leading-none">{pageCopy.notifications[key].label}</p>
                              {premium && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">PREMIUM</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{locked ? pageCopy.premiumOnly : pageCopy.notifications[key].description}</p>
                          </div>
                        </div>
                        {locked ? (
                          <Link href="/premium">
                            <button
                              className="text-xs text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30 rounded-full px-2.5 py-1 hover:bg-amber-500/10 transition-colors shrink-0"
                              data-testid={`unlock-notif-${key}`}
                            >
                              {pageCopy.upgrade}
                            </button>
                          </Link>
                        ) : (
                          <button
                            onClick={() => notifPrefsMutation.mutate({ [key]: !enabled })}
                            disabled={!notifPrefs || notifPrefsError || notifPrefsMutation.isPending}
                            className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${enabled ? "bg-sky-500" : "bg-muted-foreground/30"}`}
                            aria-pressed={enabled}
                            aria-label={enabled ? pageCopy.disable : pageCopy.enable}
                            data-testid={`toggle-notif-${key}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between gap-3" data-testid="notif-pref-learningReminders">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Languages className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-none">{engagement.reminderLabel}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{engagement.reminderDescription} {reminderDelivery}</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifPrefs?.learningReminders === true}
                      onCheckedChange={(value) => notifPrefsMutation.mutate({ learningReminders: value })}
                      disabled={!notifPrefs || notifPrefsError || notifPrefsMutation.isPending}
                      aria-label={engagement.reminderLabel}
                      data-testid="toggle-notif-learningReminders"
                    />
                  </div>
                  <MessageEmailPreference />
                </div>
              )}
            </CardContent>
          </Card>

          <Link href="/ambassadors">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-amber-500/25 bg-gradient-to-r from-amber-950/20 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-amber-500">{pageCopy.ambassadorTitle}</p>
                    <p className="text-xs text-muted-foreground">{pageCopy.ambassadorDescription}</p>
                  </div>
                  <Sparkles className="w-4 h-4 text-amber-400 animate-twinkle flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/how-it-works">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-blue-500/20 bg-gradient-to-r from-blue-950/10 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{t.howItWorks.title}</p>
                    <p className="text-xs text-muted-foreground">{t.howItWorks.heroDesc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* ── Viajes & Utilidades ─────────────────────── */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-2">{t.ui.profileTravelUtilities}</p>

          <Link href="/languages">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-purple-500/20 bg-gradient-to-r from-purple-950/10 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                    <Languages className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{t.ui.profileTravelLanguages}</p>
                    <p className="text-xs text-muted-foreground">{t.ui.profileTravelLanguagesDesc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/destinations">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-sky-500/20 bg-gradient-to-r from-sky-950/10 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-sky-500/15 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-sky-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{t.ui.profileTravelIdeas}</p>
                    <p className="text-xs text-muted-foreground">{t.ui.profileTravelIdeasDesc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tips">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-emerald-500/20 bg-gradient-to-r from-emerald-950/10 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{t.ui.profileTravelTools}</p>
                    <p className="text-xs text-muted-foreground">{t.ui.profileTravelToolsDesc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/local-help">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-orange-500/20 bg-gradient-to-r from-orange-950/10 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                    <HandHeart className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{t.ui.profileLocalHelp}</p>
                    <p className="text-xs text-muted-foreground">{t.ui.profileLocalHelpDesc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/safety">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.safety.title}</p>
                    <p className="text-xs text-muted-foreground">{t.safety.heroTitle}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Install app guide — hidden once in standalone mode */}
          {!isStandalone && (
            <Card
              className="cursor-pointer transition-colors overflow-hidden"
              style={{ borderColor: "rgba(245,158,11,0.35)", background: "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, transparent 60%)" }}
              onClick={() => setShowInstallGuide((v) => !v)}
              data-testid="card-install-app"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-amber-600 dark:text-amber-400">{pageCopy.installTitle}</p>
                    <p className="text-xs text-muted-foreground">{pageCopy.installDescription}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-amber-500 transition-transform duration-200 ${showInstallGuide ? "rotate-180" : ""}`} />
                </div>

                {showInstallGuide && (
                  <div className="mt-4 pt-4 border-t border-amber-500/20" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-3 mb-1">
                      <img src="/icons/icon-192x192.png" alt="FallonYou" className="w-14 h-14 rounded-2xl border border-amber-500/30 shrink-0" />
                      <div>
                        <p className="font-bold text-sm">FallonYou</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{pageCopy.installTagline}</p>
                        <p className="text-xs text-amber-500 mt-1 font-medium">{pageCopy.installFree}</p>
                      </div>
                    </div>

                    {isIOS ? (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">{pageCopy.iosHeading}</p>
                        <div className="space-y-2.5">
                          {pageCopy.iosSteps.map((text, i) => (
                            <div key={i} className="flex items-start gap-2.5 bg-muted/40 rounded-xl p-2.5">
                              <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-amber-500 font-bold text-xs">{i + 1}</span>
                              </div>
                              {i === 0 ? <Share2 className="w-4 h-4 text-blue-400 shrink-0" /> : <span className="text-base shrink-0">{i === 1 ? "➕" : "✅"}</span>}
                              <p className="text-xs text-foreground/80 leading-snug">{text}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground/60 text-center pt-1">{pageCopy.iosNote}</p>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">{pageCopy.androidHeading}</p>
                        <div className="space-y-2.5">
                          {pageCopy.androidSteps.map((text, i) => (
                            <div key={i} className="flex items-start gap-2.5 bg-muted/40 rounded-xl p-2.5">
                              <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-amber-500 font-bold text-xs">{i + 1}</span>
                              </div>
                              {i === 0 ? <span className="text-base shrink-0">⋮</span> : i === 1 ? <Download className="w-4 h-4 text-green-400 shrink-0" /> : <span className="text-base shrink-0">✅</span>}
                              <p className="text-xs text-foreground/80 leading-snug">{text}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground/60 text-center pt-1">{pageCopy.androidNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Premium access card */}
          <Link href="/premium">
            <Card className="cursor-pointer hover:opacity-90 transition-opacity border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-yellow-500/5" data-testid="card-premium-access">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">👑</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-amber-600 dark:text-amber-400">
                      {user.isPremium === 'true' ? pageCopy.premiumManage : pageCopy.premiumJoin}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.isPremium === 'true'
                        ? pageCopy.premiumManageDescription
                        : pageCopy.premiumBenefits}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-500/70 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/legal">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.legal.title}</p>
                    <p className="text-xs text-muted-foreground">{t.legal.terms} & {t.legal.privacy}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t.settings.support}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.contactEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {(user.isAdmin === "true" || user.email === "fallonyouapp@hotmail.com") && (
            <Link href="/admin">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{pageCopy.adminTitle}</p>
                      <p className="text-xs text-muted-foreground">{pageCopy.adminUsers}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </section>

        {/* Hidden delete account — visible only if you scroll to the very bottom */}
        <div className="pt-4 pb-2 flex justify-center">
          <Link href="/delete-account">
            <button
              className="text-[11px] text-muted-foreground/40 hover:text-destructive/70 transition-colors flex items-center gap-1 py-2 px-3"
              data-testid="button-delete-account-hidden"
            >
              <Trash2 className="w-3 h-3" />
              {pageCopy.deleteAccount}
            </button>
          </Link>
        </div>
      </div>

      <BottomNav />

      <ProfileDetailSheet
        user={{
          ...user,
          profile: {
            ...user.profile,
            age: user.profile?.showAge === true ? user.profile.age : undefined,
          },
        } as unknown as UserWithPhotos}
        open={showPreview}
        onOpenChange={setShowPreview}
      />
    </div>
  );
}
