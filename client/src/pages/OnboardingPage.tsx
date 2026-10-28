import { useState, useRef } from "react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { NotificationRecommendation } from "@/components/NotificationRecommendation";
import { MessageEmailPreference } from "@/components/MessageEmailPreference";
import { onboardingWelcomeCopy } from "@/lib/onboarding-welcome-copy";
import { PersonalPreferencesConsent } from "@/components/PersonalPreferencesConsent";
import { personalPreferencesCopy } from "@/lib/personal-preferences-copy";
import { PERSONAL_PREFERENCES_CONSENT_VERSION, hasPersonalPreferencesConsent } from "@shared/personal-preferences-consent";
import { api } from "@shared/routes";
import { hasProfilePhoto } from "@shared/profile-photo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useI18n, useTranslation } from "@/lib/i18n";
import { contentLicenseCopy } from "@/lib/content-license";
import { useUpdateProfile, useCurrentUser } from "@/hooks/use-danceme";
import { useUpload } from "@/hooks/use-upload";
import { useContentUploadConsent } from "@/components/ContentUploadConsent";
import { useLocation } from "wouter";
import { Camera, Upload, Check, ArrowRight, User, Heart, Shield, Sparkles, Loader2, Plane, Users, Bell, MapPin } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import posterBg from "@assets/poster_adventure_base.webp";

type OnboardingStep = "journey" | "profile" | "preferences" | "verification" | "notifications" | "complete";

async function prepareProfilePhoto(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    if (Math.max(bitmap.width, bitmap.height) <= 1280 && file.size <= 700_000) return file;
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.82));
    return blob ? new File([blob], "profile.jpg", { type: "image/jpeg" }) : file;
  } finally {
    bitmap.close();
  }
}

const CONNECTION_TYPE_IDS = [
  { id: "friends", icon: Users },
  { id: "travel_buddy", icon: Plane },
  { id: "something_more", icon: Heart },
];

const ACTIVITY_IDS = [
  { id: "explore_city", icon: "🏛️" },
  { id: "food_drinks", icon: "🍽️" },
  { id: "nightlife", icon: "🎉" },
  { id: "outdoor", icon: "🏔️" },
  { id: "beach", icon: "🏖️" },
  { id: "culture", icon: "🎨" },
  { id: "sports", icon: "⚽" },
  { id: "shopping", icon: "🛍️" },
];


export default function OnboardingPage() {
  const t = useTranslation();
  const { language } = useI18n();
  const welcomeCopy = onboardingWelcomeCopy[language];
  const license = contentLicenseCopy[language];
  const jt = t.onboarding.journey;

  const connectionTypeOptions = [
    { id: "friends",       label: jt.connectionFriend, icon: Users, description: jt.connectionFriendDesc },
    { id: "travel_buddy",  label: jt.connectionTravel, icon: Plane, description: jt.connectionTravelDesc },
    { id: "something_more",label: jt.connectionMore,   icon: Heart, description: jt.connectionMoreDesc },
  ];

  const activityOptions = [
    { id: "explore_city", label: jt.activityCity,     icon: "🏛️" },
    { id: "food_drinks",  label: jt.activityFood,     icon: "🍽️" },
    { id: "nightlife",    label: jt.activityNight,    icon: "🎉" },
    { id: "outdoor",      label: jt.activityOutdoor,  icon: "🏔️" },
    { id: "beach",        label: jt.activityBeach,    icon: "🏖️" },
    { id: "culture",      label: jt.activityCulture,  icon: "🎨" },
    { id: "sports",       label: jt.activitySports,   icon: "⚽" },
    { id: "shopping",     label: jt.activityShopping, icon: "🛍️" },
  ];
  const [, setLocation] = useLocation();
  const { data: user } = useCurrentUser();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { uploadFile, isUploading } = useUpload();
  const requestConsent = useContentUploadConsent();
  const { isSupported: notifSupported, isSubscribed: notifSubscribed, permission: notifPermission, subscribe: subscribeNotifs } = usePushNotifications();
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifFailed, setNotifFailed] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<OnboardingStep>("profile");
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || "",
    bio: user?.profile?.bio || "",
    age: user?.profile?.age?.toString() || "",
    gender: user?.profile?.gender || "other",
  });
  const [preferences, setPreferences] = useState({
    minAge: 18,
    maxAge: 50,
    showMe: "everyone",
    maxDistance: 50,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    user?.photos?.find(photo => photo.type === "image")?.url || user?.profileImageUrl || null,
  );
  const [photoSaved, setPhotoSaved] = useState(hasProfilePhoto(user));
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [journeySaving, setJourneySaving] = useState(false);
  const [connectionTypes, setConnectionTypes] = useState<string[]>(user?.profile?.connectionTypes || []);
  const [selectedActivities, setSelectedActivities] = useState<string[]>(user?.profile?.travelInterests || []);
  const [currentCity, setCurrentCity] = useState(user?.profile?.currentCity || "");
  const [destination, setDestination] = useState("");

  const [showWelcome, setShowWelcome] = useState(false);

  const { data: statsData } = useQuery<{ activeUsers: number }>({
    queryKey: ['/api/stats/users'],
    queryFn: async () => {
      const res = await fetch('/api/stats/users');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const activeUsers = statsData?.activeUsers ?? 0;
  const displayCount = activeUsers > 10
    ? `${activeUsers.toLocaleString('es-ES')}+`
    : '100+';

  const steps: OnboardingStep[] = ["profile", "journey", "notifications"];
  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!(await requestConsent())) return;
    setPhotoSaved(false);
    setPhotoError("");
    setPhotoSaving(true);
    setPhotoPreview(URL.createObjectURL(file));
    try {
      const result = await uploadFile(await prepareProfilePhoto(file));
      if (!result) throw new Error("Upload failed");
      const response = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: result.objectPath, type: "image" }),
      });
      if (!response.ok) throw new Error("Photo could not be saved");
      setPhotoSaved(true);
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    } catch (error) {
      console.error("Failed to upload photo:", error);
      setPhotoError(t.onboarding.photoUploadError);
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleProfileSubmit = () => {
    if (!photoSaved || photoSaving || isUploading) return;
    updateProfile(
      {
        displayName: profileData.displayName.trim() || undefined,
        bio: profileData.bio,
        age: parseInt(profileData.age) || undefined,
        gender: profileData.gender,
      },
      {
        onSuccess: () => {
          setProfileError("");
          setStep("journey");
        },
        onError: (error) => {
          console.error("Failed to update profile:", error);
          setProfileError(t.onboarding.profileSaveError);
        },
      }
    );
  };

  const [personalConsentWanted, setPersonalConsentWanted] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const [savingPreferences, setSavingPreferences] = useState(false);
  const handlePreferencesSubmit = async () => {
    setPreferencesError("");
    if (preferences.showMe !== "everyone" && !personalConsentWanted && !hasPersonalPreferencesConsent(user?.profile)) {
      setPreferencesError(personalPreferencesCopy[language].required);
      return;
    }
    setSavingPreferences(true);
    try {
      await apiRequest("PATCH", "/api/preferences", { ...preferences, ...(personalConsentWanted ? {
        personalPreferencesConsent: true, personalPreferencesConsentVersion: PERSONAL_PREFERENCES_CONSENT_VERSION,
      } : {}) });
      await queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      setStep("verification");
    } catch {
      setPreferencesError(t.common.error);
    } finally { setSavingPreferences(false); }
  };

  const handleSkipVerification = () => {
    setStep("notifications");
  };

  const handleEnableNotifications = async () => {
    setNotifLoading(true);
    setNotifFailed(false);
    try {
      const success = await subscribeNotifs();
      if (success) setNotifEnabled(true);
      else setNotifFailed(true);
    } catch {
      setNotifFailed(true);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleComplete = () => {
    setLocation("/profile");
  };

  // Auto-verification mutation
  const autoVerifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/verification/request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verification/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setStep("notifications");
    },
    onError: () => {
      setStep("notifications");
    },
  });

  const stepIcons = {
    journey: Plane,
    profile: User,
    preferences: Heart,
    verification: Shield,
    notifications: Bell,
    complete: Sparkles,
  };

  const toggleActivity = (activityId: string) => {
    setSelectedActivities(prev => 
      prev.includes(activityId) 
        ? prev.filter(a => a !== activityId)
        : [...prev, activityId]
    );
  };

  const handleJourneySubmit = async () => {
    setJourneySaving(true);
    try {
      await apiRequest("PATCH", "/api/profile", {
        connectionTypes,
        travelInterests: selectedActivities,
        currentCity: currentCity || undefined,
        destination: destination || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      setStep("notifications");
    } catch (error) {
      console.error("Failed to update journey:", error);
      setProfileError(t.onboarding.profileSaveError);
    } finally {
      setJourneySaving(false);
    }
  };

  const toggleConnectionType = (type: string) => {
    setConnectionTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  
  // ── Welcome / FOMO splash screen ──────────────────────────────────
  if (showWelcome) {
    const blurredAvatars = [
      { color: 'from-rose-400 to-pink-600', size: 'w-16 h-16', top: '18%', left: '8%', delay: '0s' },
      { color: 'from-amber-400 to-orange-500', size: 'w-14 h-14', top: '12%', left: '62%', delay: '0.3s' },
      { color: 'from-sky-400 to-blue-600', size: 'w-12 h-12', top: '30%', left: '80%', delay: '0.6s' },
      { color: 'from-violet-400 to-purple-600', size: 'w-18 h-18 w-[72px] h-[72px]', top: '22%', left: '38%', delay: '0.2s' },
      { color: 'from-emerald-400 to-teal-600', size: 'w-10 h-10', top: '8%', left: '28%', delay: '0.5s' },
      { color: 'from-fuchsia-400 to-pink-600', size: 'w-12 h-12', top: '35%', left: '5%', delay: '0.8s' },
    ];

    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #0f0f0f 0%, #1a1208 50%, #0f0f0f 100%)' }}>
        <div className="relative z-10 flex justify-end p-4"><LanguageSelector showLabel /></div>
        {/* Blurred avatar cloud */}
        <div className="relative h-56 overflow-hidden">
          {blurredAvatars.map((av, i) => (
            <div
              key={i}
              className={`absolute ${av.size} rounded-full bg-gradient-to-br ${av.color} blur-sm opacity-60`}
              style={{ top: av.top, left: av.left, animationDelay: av.delay }}
            >
              <div className="w-full h-full rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white/40" />
              </div>
            </div>
          ))}
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0f0f0f]" />
          {/* Lock icon overlay center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-6 py-3 border border-amber-500/30">
              <p className="text-amber-400 text-sm font-semibold text-center">
                {welcomeCopy.unlock}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 -mt-4">
          {/* User count badge */}
          <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-full px-4 py-1.5 mb-6">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-amber-300 text-sm font-medium">
              {displayCount} {welcomeCopy.active}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-white text-3xl font-black text-center leading-tight mb-3">
            {welcomeCopy.title}<br />
            <span style={{
              background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {welcomeCopy.highlight}
            </span>
          </h1>
          <p className="text-zinc-400 text-center text-sm leading-relaxed mb-8 max-w-xs">
            {welcomeCopy.description}
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[
              { icon: '✈️', text: welcomeCopy.travel },
              { icon: '🎉', text: welcomeCopy.activities },
              { icon: '❤️', text: welcomeCopy.connections },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-zinc-300">
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button
            className="w-full max-w-xs h-14 text-base font-bold rounded-2xl text-black"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            onClick={() => setShowWelcome(false)}
            data-testid="button-start-onboarding"
          >
            {welcomeCopy.start}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <p className="text-zinc-600 text-xs mt-4 text-center">
            {welcomeCopy.footer}
          </p>
        </div>
      </div>
    );
  }
  // ── End welcome screen ─────────────────────────────────────────────

  return (
    <div className="dark min-h-screen flex flex-col relative overflow-hidden">
      {/* Background image */}
      <img
        src={posterBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-top"
        draggable={false}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/65 to-black/85" />
      <div className="absolute inset-0 bg-gradient-to-br from-amber-950/20 via-transparent to-amber-950/20" />

      {/* Progress header */}
      <div className="relative z-10 p-4" style={{ borderBottom: "1px solid rgba(245,158,11,0.15)" }}>
        <div className="max-w-md mx-auto">
          <div className="flex justify-end mb-3"><LanguageSelector showLabel /></div>
          <div className="flex items-center justify-between mb-3">
            {steps.map((s, i) => {
              const Icon = stepIcons[s];
              const isActive = i === currentStepIndex;
              const isCompleted = i < currentStepIndex;
              return (
                <div
                  key={s}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                      : isActive
                      ? "border-2 border-amber-500 text-amber-400"
                      : "text-white/25"
                  }`}
                  style={
                    isActive
                      ? { background: "rgba(245,158,11,0.12)" }
                      : !isCompleted
                      ? { background: "rgba(255,255,255,0.06)" }
                      : {}
                  }
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
              );
            })}
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg,#D97706,#F59E0B,#FCD34D)",
                boxShadow: "0 0 8px rgba(251,191,36,0.5)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-5 overflow-y-auto">
        <div className="w-full max-w-md">
          {step === "journey" && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                    <Plane className="w-8 h-8 text-amber-500 -rotate-45" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{jt.title}</h2>
                  <p className="text-muted-foreground">{jt.subtitle}</p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-3 block">{jt.connectionLabel}</label>
                  <div className="grid grid-cols-1 gap-2">
                    {connectionTypeOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected = connectionTypes.includes(option.id);
                      return (
                        <Button
                          key={option.id}
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => toggleConnectionType(option.id)}
                          className={`flex items-center justify-start h-auto py-4 gap-4 ${isSelected ? "bg-amber-500 hover:bg-amber-600 border-amber-500" : ""}`}
                          data-testid={`button-connection-${option.id}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? "bg-white/20" : "bg-muted"}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">{option.label}</p>
                            <p className={`text-xs ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>{option.description}</p>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-3 block">{jt.activityLabel}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {activityOptions.map((activity) => {
                      const isSelected = selectedActivities.includes(activity.id);
                      return (
                        <Button
                          key={activity.id}
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => toggleActivity(activity.id)}
                          className={`flex items-center justify-start h-auto py-3 gap-2 text-sm ${isSelected ? "bg-amber-500 hover:bg-amber-600 border-amber-500" : ""}`}
                          data-testid={`button-activity-${activity.id}`}
                        >
                          <span className="text-lg">{activity.icon}</span>
                          <span className="text-left text-xs">{activity.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">{jt.currentCity}</label>
                    <Input
                      value={currentCity}
                      onChange={(e) => setCurrentCity(e.target.value)}
                      placeholder={jt.currentCityPlaceholder}
                      data-testid="input-current-city"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">{jt.destination}</label>
                    <Input
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder={jt.destinationPlaceholder}
                      data-testid="input-destination"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleJourneySubmit}
                  disabled={journeySaving}
                  className="w-full bg-amber-500 hover:bg-amber-600"
                  data-testid="button-next-journey"
                >
                  {journeySaving ? t.onboarding.saving : jt.continue}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="ghost" className="w-full" disabled={journeySaving} onClick={() => setLocation("/profile")}>{t.onboarding.doLater}</Button>
                {profileError && <p role="alert" className="text-sm text-destructive">{profileError}</p>}
              </CardContent>
            </Card>
          )}

          {step === "profile" && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">{t.onboarding.step1Title}</h2>
                  <p className="text-muted-foreground">{t.onboarding.step1Desc}</p>
                </div>

                {/* Photo upload — required */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-32 h-32 rounded-full bg-muted flex items-center justify-center cursor-pointer overflow-hidden border-4 border-dashed transition-colors ${
                      photoPreview ? "border-amber-500" : "border-amber-400 animate-pulse"
                    } hover:border-amber-600`}
                    onClick={() => { if (!photoSaving && !isUploading) fileInputRef.current?.click(); }}
                    data-testid="button-upload-photo"
                  >
                    {photoPreview ? (
                      <div className="relative w-full h-full">
                        <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                        {(photoSaving || isUploading) && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-7 h-7 text-white animate-spin" /></div>}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Camera className="w-8 h-8 text-amber-500" />
                        <span className="text-xs font-medium text-amber-600">{t.onboarding.uploadPhoto}</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    disabled={photoSaving || isUploading}
                    className="hidden"
                    onChange={handlePhotoUpload}
                    data-testid="input-photo-upload"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-amber-600">{t.onboarding.photoRequired}</span>
                    <span className="text-xs text-muted-foreground">{t.onboarding.photoRequiredHint}</span>
                  </div>
                  {!photoSaved && !user?.photos?.length && (
                    <p className="max-w-xs text-center text-xs leading-relaxed text-muted-foreground" data-testid="first-photo-reminder">
                      {license.firstProfilePhotoReminder}
                    </p>
                  )}
                  {(photoSaving || isUploading) && <p role="status" className="text-sm text-muted-foreground">{t.onboarding.uploadingPhoto}</p>}
                  {photoSaved && <p role="status" className="text-sm text-emerald-600">{t.onboarding.photoSaved}</p>}
                  {photoError && <p role="alert" className="text-sm text-destructive">{photoError}</p>}
                </div>

                {/* Profile form */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">{t.profile.displayName} {t.onboarding.optionalDetail}</label>
                    <Input
                      value={profileData.displayName}
                      onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                      placeholder={t.profile.displayName}
                      data-testid="input-display-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t.profile.bio} {t.onboarding.optionalDetail}</label>
                    <Textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      placeholder={t.profile.bio}
                      rows={3}
                      data-testid="input-bio"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">{t.profile.age} {t.onboarding.optionalDetail}</label>
                      <Input
                        type="number"
                        value={profileData.age}
                        onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                        placeholder="25"
                        min={18}
                        max={100}
                        data-testid="input-age"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t.profile.gender} {t.onboarding.optionalDetail}</label>
                      <select
                        value={profileData.gender}
                        onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                        className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                        data-testid="select-gender"
                      >
                        <option value="male">{t.profile.male}</option>
                        <option value="female">{t.profile.female}</option>
                        <option value="other">{t.profile.other}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {!photoPreview && (
                  <p className="text-center text-sm text-amber-600 font-medium">
                    {t.onboarding.addPhotoToContinue}
                  </p>
                )}
                {profileError && <p role="alert" className="text-sm text-destructive">{profileError}</p>}
                <Button
                  onClick={handleProfileSubmit}
                  disabled={isPending || isUploading || photoSaving || !photoSaved}
                  className="w-full"
                  data-testid="button-next-step"
                >
                  {isUploading ? t.onboarding.uploadingPhoto : t.onboarding.next}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "preferences" && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">{t.onboarding.step2Title}</h2>
                  <p className="text-muted-foreground">{t.onboarding.step2Desc}</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium">{t.swipe.showMe}</label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {["everyone", "men", "women"].map((option) => (
                        <Button
                          key={option}
                          variant={preferences.showMe === option ? "default" : "outline"}
                          onClick={() => setPreferences({ ...preferences, showMe: option })}
                          className="capitalize"
                          data-testid={`button-show-${option}`}
                        >
                          {option === "everyone" ? t.swipe.everyone : option === "men" ? t.swipe.men : t.swipe.women}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      {t.swipe.ageRange}: {preferences.minAge} - {preferences.maxAge}
                    </label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <Input
                        type="number"
                        value={preferences.minAge}
                        onChange={(e) => setPreferences({ ...preferences, minAge: parseInt(e.target.value) || 18 })}
                        min={18}
                        max={100}
                        data-testid="input-min-age"
                      />
                      <Input
                        type="number"
                        value={preferences.maxAge}
                        onChange={(e) => setPreferences({ ...preferences, maxAge: parseInt(e.target.value) || 50 })}
                        min={18}
                        max={100}
                        data-testid="input-max-age"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      {t.swipe.maxDistance}: {preferences.maxDistance} {t.swipe.km}
                    </label>
                    <Input
                      type="range"
                      value={preferences.maxDistance}
                      onChange={(e) => setPreferences({ ...preferences, maxDistance: parseInt(e.target.value) })}
                      min={5}
                      max={200}
                      className="mt-2"
                      data-testid="input-max-distance"
                    />
                  </div>
                </div>

                <PersonalPreferencesConsent checked={personalConsentWanted} granted={hasPersonalPreferencesConsent(user?.profile)} onChange={setPersonalConsentWanted} />
                {preferencesError && <p role="alert" className="text-sm text-destructive">{preferencesError}</p>}
                <Button onClick={handlePreferencesSubmit} disabled={savingPreferences} className="w-full" data-testid="button-next-preferences">
                  {t.onboarding.next}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "verification" && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    {autoVerifyMutation.isPending ? (
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    ) : (
                      <Shield className="w-10 h-10 text-primary" />
                    )}
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{t.onboarding.step3Title}</h2>
                  <p className="text-muted-foreground">
                    {autoVerifyMutation.isPending 
                      ? (t.verification.verifying || "Verifying your account...")
                      : t.onboarding.step3Desc}
                  </p>
                </div>

                {autoVerifyMutation.isPending && (
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">{t.verification.benefits}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === "notifications" && (
            <NotificationRecommendation
              language={language} supported={notifSupported}
              subscribed={notifSubscribed || notifEnabled} permission={notifPermission}
              loading={notifLoading} failed={notifFailed}
              onEnable={handleEnableNotifications} onContinue={handleComplete}
            >
              <MessageEmailPreference />
            </NotificationRecommendation>
          )}

          {step === "complete" && (
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Celebration header */}
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-10 h-10 text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{t.onboarding.completeStep.title}</h2>
                  <p className="text-muted-foreground text-sm">
                    {t.onboarding.completeStep.desc}
                  </p>
                </div>

                {/* Next steps guide */}
                <div className="space-y-3">
                  {[
                    {
                      icon: "📸",
                      title: t.onboarding.completeStep.step1Title,
                      desc: t.onboarding.completeStep.step1Desc,
                      badge: t.onboarding.completeStep.step1Badge,
                      badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                    },
                    {
                      icon: "✍️",
                      title: t.onboarding.completeStep.step2Title,
                      desc: t.onboarding.completeStep.step2Desc,
                      badge: t.onboarding.completeStep.step2Badge,
                      badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
                    },
                    {
                      icon: "🎉",
                      title: t.onboarding.completeStep.step3Title,
                      desc: t.onboarding.completeStep.step3Desc,
                      badge: t.onboarding.completeStep.step3Badge,
                      badgeColor: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 bg-muted/40 rounded-xl p-3">
                      <div className="text-2xl flex-shrink-0 mt-0.5">{item.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-semibold text-sm">{item.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Verification info */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-center">
                  <Shield className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <p className="font-semibold text-amber-800 dark:text-amber-300">{t.onboarding.completeStep.verifyTitle}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.onboarding.completeStep.verifyDesc}
                  </p>
                </div>

                <div className="space-y-2">
                  <Button onClick={handleComplete} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold" size="lg" data-testid="button-finish-onboarding">
                    {t.onboarding.completeStep.button}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="ghost" onClick={() => setLocation("/")} className="w-full text-muted-foreground text-sm" data-testid="button-skip-complete">
                    {t.onboarding.completeStep.later}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
