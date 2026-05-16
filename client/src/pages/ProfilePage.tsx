import { useCurrentUser, useUpdateProfile, useDeletePhoto, UserWithPhotos } from "@/hooks/use-danceme";
import { ProfileDetailSheet } from "@/components/ProfileDetailSheet";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, LogOut, Shield, User, Star, Plane, MapPin, Heart, Trash2, FileText, Mail, Briefcase, Eye, Sparkles, Lightbulb, ChevronRight, Flame, Trophy, Zap, Globe2, Smartphone, ChevronDown, Share2, Download } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VerificationStatus } from "@/components/VerificationBadge";
import { NotificationToggle } from "@/components/NotificationToggle";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { queryClient } from "@/lib/queryClient";

export default function ProfilePage() {
  const { data: user, isLoading } = useCurrentUser();
  const { logout } = useAuth();
  const t = useTranslation();
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
  const { data: badges } = useQuery<{ id: string; icon: string; label: string; description: string; earned: boolean }[]>({
    queryKey: ["/api/my-badges"],
    enabled: !!user,
  });

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formState, setFormState] = useState({
    displayName: "",
    bio: "",
    age: 18,
    gender: "",
    preference: "",
    occupation: "",
    birthplace: "",
    nextAdventure: "",
  });

  // Must be before any conditional returns
  const [isSettingProfilePic, setIsSettingProfilePic] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;

  const { data: connectedCities } = useQuery<{ cities: string[] }>({
    queryKey: ["/api/my-connected-cities"],
    enabled: !!user,
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

  useEffect(() => {
    if (user) {
      setFormState({
        displayName: user.displayName || user.firstName || "",
        bio: user.bio || user.profile?.bio || "",
        age: user.age || user.profile?.age || 18,
        gender: user.gender || user.profile?.gender || "",
        preference: user.preference || user.profile?.preference || "",
        occupation: user.profile?.occupation || "",
        birthplace: user.profile?.birthplace || "",
        nextAdventure: (user.profile as any)?.nextAdventure || "",
      });
    }
  }, [user]);

  if (isLoading) return (
    <div className="h-screen w-full flex items-center justify-center">
      <Loader2 className="animate-spin text-primary w-8 h-8" />
    </div>
  );
  if (!user) return null;

  const handleSave = () => {
    updateProfile(formState, {
      onSuccess: () => {
        toast({
          title: t.profile.saved || "Perfil guardado",
          description: t.profile.savedDescription || "Tu perfil ha sido actualizado correctamente",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "No se pudo guardar el perfil. Inténtalo de nuevo.",
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
    setIsSettingProfilePic(true);
    try {
      const res = await fetch("/api/profile-image", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: photoUrl }),
        credentials: "include",
      });
      if (res.ok) {
        toast({
          title: t.profile.profilePhotoSet || "Foto de perfil establecida",
          description: t.profile.profilePhotoSetDescription || "Tu foto de perfil ha sido actualizada",
        });
        queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      }
    } catch {
      toast({ title: "Error", description: "No se pudo establecer la foto", variant: "destructive" });
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
          <Heart  className="absolute text-amber-400 fill-amber-400 w-4 h-4 animate-slowblink"   style={{ top: '12%', left:  '6%' }} />
          <Star   className="absolute text-yellow-400 fill-yellow-400 w-3 h-3 animate-slowblink-1" style={{ top: '18%', left: '18%' }} />
          <Heart  className="absolute text-amber-300 fill-amber-300 w-3 h-3 animate-slowblink-2" style={{ top:  '8%', left: '32%' }} />
          <Star   className="absolute text-amber-500 fill-amber-500 w-4 h-4 animate-slowblink-3" style={{ top: '22%', left: '50%' }} />
          <Heart  className="absolute text-yellow-300 fill-yellow-300 w-3 h-3 animate-slowblink-4" style={{ top:  '9%', left: '65%' }} />
          <Star   className="absolute text-amber-400 fill-amber-400 w-4 h-4 animate-slowblink-5" style={{ top: '20%', left: '80%' }} />
          <Heart  className="absolute text-amber-300 fill-amber-300 w-3 h-3 animate-slowblink-6" style={{ top: '15%', left: '92%' }} />
          <Star   className="absolute text-yellow-500 fill-yellow-500 w-3 h-3 animate-slowblink-7" style={{ top: '62%', left:  '3%' }} />
          <Heart  className="absolute text-amber-400 fill-amber-400 w-5 h-5 animate-slowblink-3" style={{ top: '70%', left: '22%' }} />
          <Star   className="absolute text-amber-300 fill-amber-300 w-3 h-3 animate-slowblink-1" style={{ top: '55%', left: '42%' }} />
          <Heart  className="absolute text-yellow-400 fill-yellow-400 w-3 h-3 animate-slowblink-5" style={{ top: '75%', left: '60%' }} />
          <Star   className="absolute text-amber-500 fill-amber-500 w-4 h-4 animate-slowblink-2" style={{ top: '58%', left: '76%' }} />
          <Heart  className="absolute text-amber-300 fill-amber-300 w-3 h-3 animate-slowblink-6" style={{ top: '68%', left: '90%' }} />
          <Sparkles className="absolute text-yellow-300 fill-yellow-300 w-4 h-4 animate-slowblink-4" style={{ top: '35%', left: '12%' }} />
          <Sparkles className="absolute text-amber-400 fill-amber-400 w-3 h-3 animate-slowblink-7" style={{ top: '40%', left: '87%' }} />
        </div>

        {/* Name + icons row */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3">
            <Heart className="w-9 h-9 text-amber-400 fill-amber-400 animate-twinkle" />
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
              {formState.displayName || user.firstName || "You"}
            </span>
            <Plane className="w-9 h-9 text-amber-400 fill-amber-400 animate-twinkle-delay-2 rotate-45" />
            <Heart className="w-9 h-9 text-amber-400 fill-amber-400 animate-twinkle-delay-3" />
          </div>
        </div>

        {/* Gold accent line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

        {/* Profile photo */}
        <div className="absolute -bottom-12 left-6">
          <div className="relative w-24 h-24">
            <div className="absolute -inset-1.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full animate-ringpulse" />
            <img
              src={user.profileImageUrl || user.photos?.[0]?.url || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=200&auto=format&fit=crop&q=60"}
              className="relative w-full h-full rounded-full object-cover border-3 border-background shadow-lg"
              alt="Perfil"
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
            onClick={() => logout()}
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
            { done: !!(user.profileImageUrl || user.photos?.[0]?.url), label: 'Foto de perfil' },
            { done: !!formState.displayName, label: 'Nombre' },
            { done: !!formState.bio, label: 'Bio' },
            { done: !!(formState.age && formState.age > 0), label: 'Edad' },
            { done: (user.photos?.length ?? 0) >= 3, label: '3 fotos' },
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
                  <span className="text-sm font-semibold">Perfil {pct}% completo</span>
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
                Falta: <span className="text-foreground font-medium">{missing.join(', ')}</span>
              </p>
              <p className="text-xs text-amber-600 mt-1 font-medium">
                Los perfiles completos reciben el doble de conexiones
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
                <span className="text-xs font-semibold text-muted-foreground">Racha</span>
              </div>
              <p className="text-3xl font-black text-amber-500 leading-none">
                {streakData?.streak ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {streakData?.streak === 1 ? "día seguido" : "días seguidos"}
              </p>
              {(streakData?.longestStreak ?? 0) > 0 && (
                <p className="text-[10px] text-amber-400/70 mt-0.5">
                  Récord: {streakData!.longestStreak}d
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
                <span className="text-xs font-semibold text-muted-foreground">Vistas hoy</span>
              </div>
              <p className="text-3xl font-black text-blue-500 leading-none">
                {viewsToday?.count ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {(viewsToday?.count ?? 0) === 1 ? "persona" : "personas"}
              </p>
              <p className="text-[10px] text-blue-400/70 mt-0.5">vieron tu perfil</p>
            </div>
          </div>
        </div>

        {/* ── Insignias / Logros ──────────────────────────────────────────── */}
        {badges && badges.length > 0 && (
          <div className="bg-card border rounded-2xl p-4 shadow-sm" data-testid="section-badges">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold">Logros</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {badges.filter(b => b.earned).length}/{badges.length}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  title={badge.earned ? badge.description : `🔒 ${badge.description}`}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${badge.earned ? "opacity-100" : "opacity-30 grayscale"}`}
                  data-testid={`badge-${badge.id}`}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <span className="text-[9px] font-semibold text-center leading-tight text-foreground" style={{ maxWidth: "48px" }}>
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
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
                <p className="font-bold text-sm">{t.engagement?.availableToday || "Disponible hoy"}</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  {isAvailable ? (t.engagement?.availableActive || "Estás disponible para quedar hoy ✓") : (t.engagement?.availableInactive || "Activa para que otros sepan que puedes quedar")}
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
                <p className="font-bold text-sm">{t.engagement?.availableAsGuide || "Disponible de guía"}</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  {isGuide
                    ? (t.engagement?.availableAsGuideActive || "Ofreces mostrar tu ciudad a turistas ✓")
                    : (t.engagement?.availableAsGuideInactive || "Activa para que turistas puedan pedirte ayuda")}
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

        {/* ── Ciudades conectadas ───────────────────────────────────────────── */}
        {connectedCities && connectedCities.cities.length > 0 && (
          <div className="bg-card border rounded-2xl p-4 shadow-sm" data-testid="section-connected-cities">
            <div className="flex items-center gap-2 mb-3">
              <Globe2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold">{t.engagement?.connectedCities || "Ciudades conectadas"}</span>
              <span className="ml-auto text-xs text-muted-foreground">{connectedCities.cities.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {connectedCities.cities.map((city) => (
                <span
                  key={city}
                  className="inline-flex items-center gap-1.5 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-full font-medium"
                >
                  <MapPin className="w-3 h-3" />
                  {city}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Ver perfil preview */}
        <Button
          variant="outline"
          className="w-full h-10 rounded-xl font-medium border-primary/30 text-primary hover:bg-primary/5"
          onClick={() => setShowPreview(true)}
          data-testid="button-ver-perfil"
        >
          <Eye className="w-4 h-4 mr-2" />
          {t.profile.viewProfile || "Ver mi perfil"}
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
                value={formState.age || ""}
                onChange={(e) => setFormState({ ...formState, age: parseInt(e.target.value) || 18 })}
                className="rounded-xl"
                min={18}
                max={100}
                data-testid="input-age"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{t.profile.bio}</label>
            <Textarea
              value={formState.bio}
              onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
              className="rounded-xl min-h-[100px]"
              placeholder={t.profile.bioPlaceholder || "Cuéntanos algo sobre ti..."}
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
                <option value="male">{t.profile.male || "Hombre"}</option>
                <option value="female">{t.profile.female || "Mujer"}</option>
                <option value="other">{t.profile.other || "Otro"}</option>
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
                <option value="men">{t.swipe?.men || "Hombres"}</option>
                <option value="women">{t.swipe?.women || "Mujeres"}</option>
                <option value="everyone">{t.swipe?.everyone || "Todos"}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                {t.profileDetails?.occupation || "Ocupación"}
              </label>
              <Input
                value={formState.occupation}
                onChange={(e) => setFormState({ ...formState, occupation: e.target.value })}
                className="rounded-xl"
                placeholder={t.profileDetails?.occupationPlaceholder || "¿A qué te dedicas?"}
                data-testid="input-occupation"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {t.profileDetails?.birthplace || "Ciudad"}
              </label>
              <Input
                value={formState.birthplace}
                onChange={(e) => setFormState({ ...formState, birthplace: e.target.value })}
                className="rounded-xl"
                placeholder={t.profileDetails?.birthplacePlaceholder || "¿De dónde eres?"}
                data-testid="input-birthplace"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5" />
              {t.engagement?.nextAdventure || "Mi próxima aventura"}
            </label>
            <Input
              value={formState.nextAdventure}
              onChange={(e) => setFormState({ ...formState, nextAdventure: e.target.value })}
              className="rounded-xl"
              placeholder={t.engagement?.nextAdventurePlaceholder || "¿A dónde quieres ir? Lisboa, Tokio..."}
              data-testid="input-next-adventure"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={isUpdating}
            className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
            data-testid="button-save-profile"
          >
            {isUpdating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.common?.loading || "Guardando..."}</>
            ) : (
              t.profile.save
            )}
          </Button>
        </section>

        {/* Photos */}
        <section className="space-y-3">
          <h2 className="text-xl font-display font-bold">{t.profile.photos}</h2>
          {(user.photos?.length ?? 0) > 0 && (
            <p className="text-sm text-muted-foreground">{t.profile.tapToSetProfile || "Toca una foto para establecerla como foto de perfil"}</p>
          )}
          <div className="grid grid-cols-3 gap-3">
            {user.photos?.map((photo) => {
              const isProfilePic = user.profileImageUrl === photo.url;
              return (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={photo.url} className="w-full h-full object-cover" alt="Foto" />
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
                          toast({ title: "Foto obligatoria", description: "Debes tener al menos una foto en tu perfil.", variant: "destructive" });
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

          <Link href="/ambassadors">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-amber-500/25 bg-gradient-to-r from-amber-950/20 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-amber-500">Programa de Embajadores</p>
                    <p className="text-xs text-muted-foreground">Invita amigos y gana recompensas Premium</p>
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
                    <p className="font-bold text-sm">{t.howItWorks?.title || "Cómo funciona"}</p>
                    <p className="text-xs text-muted-foreground">{t.howItWorks?.heroDesc || "Guía completa para sacar el máximo partido"}</p>
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
                    <p className="font-medium text-sm">{t.safety?.title || "Centro de Seguridad"}</p>
                    <p className="text-xs text-muted-foreground">{t.safety?.heroTitle || "Tu seguridad es nuestra prioridad"}</p>
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
                    <p className="font-medium text-sm text-amber-600 dark:text-amber-400">Descarga la app</p>
                    <p className="text-xs text-muted-foreground">Tenla siempre a mano en tu móvil</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-amber-500 transition-transform duration-200 ${showInstallGuide ? "rotate-180" : ""}`} />
                </div>

                {showInstallGuide && (
                  <div className="mt-4 pt-4 border-t border-amber-500/20" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-3 mb-1">
                      <img src="/icons/icon-192x192.png" alt="FallonYou" className="w-14 h-14 rounded-2xl border border-amber-500/30 shrink-0" />
                      <div>
                        <p className="font-bold text-sm">FallonYou</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Actividades · Viajes · Conexiones</p>
                        <p className="text-xs text-amber-500 mt-1 font-medium">Gratis · Sin tienda de apps</p>
                      </div>
                    </div>

                    {isIOS ? (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Cómo instalar en iPhone</p>
                        <div className="space-y-2.5">
                          {[
                            { icon: <Share2 className="w-4 h-4 text-blue-400 shrink-0" />, text: <>Pulsa el botón <strong>Compartir</strong> <Share2 className="inline w-3 h-3" /> en la barra inferior de Safari</> },
                            { icon: <span className="text-base shrink-0">➕</span>, text: <>Desliza y toca <strong>"Añadir a pantalla de inicio"</strong></> },
                            { icon: <span className="text-base shrink-0">✅</span>, text: <>Pulsa <strong>"Añadir"</strong> — el icono aparece en tu escritorio</> },
                          ].map((step, i) => (
                            <div key={i} className="flex items-start gap-2.5 bg-muted/40 rounded-xl p-2.5">
                              <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-amber-500 font-bold text-xs">{i + 1}</span>
                              </div>
                              {step.icon}
                              <p className="text-xs text-foreground/80 leading-snug">{step.text}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground/60 text-center pt-1">Solo funciona desde Safari en iPhone/iPad</p>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Cómo instalar en Android</p>
                        <div className="space-y-2.5">
                          {[
                            { icon: <span className="text-base shrink-0">⋮</span>, text: <>Toca el menú <strong>⋮</strong> en la esquina superior de Chrome</> },
                            { icon: <Download className="w-4 h-4 text-green-400 shrink-0" />, text: <>Selecciona <strong>"Añadir a pantalla de inicio"</strong> o <strong>"Instalar app"</strong></> },
                            { icon: <span className="text-base shrink-0">✅</span>, text: <>Pulsa <strong>"Instalar"</strong> — el icono aparece en tu móvil</> },
                          ].map((step, i) => (
                            <div key={i} className="flex items-start gap-2.5 bg-muted/40 rounded-xl p-2.5">
                              <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-amber-500 font-bold text-xs">{i + 1}</span>
                              </div>
                              {step.icon}
                              <p className="text-xs text-foreground/80 leading-snug">{step.text}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground/60 text-center pt-1">Funciona en Chrome, Edge y la mayoría de navegadores Android</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                      <p className="font-medium text-sm">{t.admin?.title || "Panel Admin"}</p>
                      <p className="text-xs text-muted-foreground">{t.admin?.users || "Gestionar usuarios"}</p>
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
              Eliminar mi cuenta
            </button>
          </Link>
        </div>
      </div>

      <BottomNav />

      <ProfileDetailSheet
        user={user as unknown as UserWithPhotos}
        open={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
}
