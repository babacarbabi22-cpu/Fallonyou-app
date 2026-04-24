import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/lib/i18n";
import { useUpdateProfile, useCurrentUser } from "@/hooks/use-danceme";
import { useUpload } from "@/hooks/use-upload";
import { useLocation } from "wouter";
import { Camera, Upload, Check, ArrowRight, User, Heart, Shield, Sparkles, Loader2, Plane, Users, Bell, BellOff, MapPin } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePushNotifications } from "@/hooks/use-push-notifications";

type OnboardingStep = "journey" | "profile" | "preferences" | "verification" | "notifications" | "complete";

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
  const { isSupported: notifSupported, subscribe: subscribeNotifs } = usePushNotifications();
  const [notifLoading, setNotifLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<OnboardingStep>("journey");
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || "",
    bio: "",
    age: "",
    gender: "other",
  });
  const [preferences, setPreferences] = useState({
    minAge: 18,
    maxAge: 50,
    showMe: "everyone",
    maxDistance: 50,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [connectionTypes, setConnectionTypes] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [currentCity, setCurrentCity] = useState("");
  const [destination, setDestination] = useState("");

  const [showWelcome, setShowWelcome] = useState(true);

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

  const steps: OnboardingStep[] = ["journey", "profile", "preferences", "verification", "notifications", "complete"];
  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      await uploadFile(file);
    } catch (error) {
      console.error("Failed to upload photo:", error);
    }
  };

  const handleProfileSubmit = () => {
    updateProfile(
      {
        displayName: profileData.displayName,
        bio: profileData.bio,
        age: parseInt(profileData.age) || undefined,
        gender: profileData.gender,
      },
      {
        onSuccess: () => {
          setStep("preferences");
        },
        onError: (error) => {
          console.error("Failed to update profile:", error);
        },
      }
    );
  };

  const handlePreferencesSubmit = () => {
    setStep("verification");
  };

  const handleSkipVerification = () => {
    setStep("notifications");
  };

  const handleEnableNotifications = async () => {
    setNotifLoading(true);
    await subscribeNotifs();
    setNotifLoading(false);
    setStep("complete");
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

  // Auto-verify when reaching the verification step
  useEffect(() => {
    if (step === "verification" && !autoVerifyMutation.isPending && !autoVerifyMutation.isSuccess) {
      autoVerifyMutation.mutate();
    }
  }, [step]);

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
    try {
      await apiRequest("PATCH", "/api/profile", {
        connectionTypes,
        travelInterests: selectedActivities,
        currentCity: currentCity || undefined,
        destination: destination || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setStep("profile");
    } catch (error) {
      console.error("Failed to update journey:", error);
      setStep("profile");
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
                🔒 Completa tu perfil para desbloquear
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
              {displayCount} personas activas ahora
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-white text-3xl font-black text-center leading-tight mb-3">
            Conecta con viajeros<br />
            <span style={{
              background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              de todo el mundo
            </span>
          </h1>
          <p className="text-zinc-400 text-center text-sm leading-relaxed mb-8 max-w-xs">
            Planes, aventuras y conexiones reales. Tu próxima experiencia empieza aquí.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[
              { icon: '✈️', text: 'Compañeros de viaje' },
              { icon: '🎉', text: 'Actividades locales' },
              { icon: '❤️', text: 'Conexiones reales' },
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
            Crear mi perfil gratis
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <p className="text-zinc-600 text-xs mt-4 text-center">
            Solo tardas 2 minutos · Gratis para siempre
          </p>
        </div>
      </div>
    );
  }
  // ── End welcome screen ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress header */}
      <div className="p-4 border-b">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            {steps.map((s, i) => {
              const Icon = stepIcons[s];
              const isActive = i === currentStepIndex;
              const isCompleted = i < currentStepIndex;
              return (
                <div
                  key={s}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isActive
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
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
                  disabled={connectionTypes.length === 0}
                  className="w-full bg-amber-500 hover:bg-amber-600"
                  data-testid="button-next-journey"
                >
                  {jt.continue}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
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
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-photo"
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
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
                    className="hidden"
                    onChange={handlePhotoUpload}
                    data-testid="input-photo-upload"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-amber-600">{t.onboarding.photoRequired}</span>
                    <span className="text-xs text-muted-foreground">{t.onboarding.photoRequiredHint}</span>
                  </div>
                </div>

                {/* Profile form */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">{t.profile.displayName}</label>
                    <Input
                      value={profileData.displayName}
                      onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                      placeholder={t.profile.displayName}
                      data-testid="input-display-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t.profile.bio}</label>
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
                      <label className="text-sm font-medium">{t.profile.age}</label>
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
                      <label className="text-sm font-medium">{t.profile.gender}</label>
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
                <Button
                  onClick={handleProfileSubmit}
                  disabled={isPending || isUploading || !profileData.displayName || !photoPreview}
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

                <Button onClick={handlePreferencesSubmit} className="w-full" data-testid="button-next-preferences">
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
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-10 h-10 text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{t.onboarding.notifStep.title}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t.onboarding.notifStep.desc}
                  </p>
                </div>

                <div className="space-y-2">
                  {[
                    t.onboarding.notifStep.bullet1,
                    t.onboarding.notifStep.bullet2,
                    t.onboarding.notifStep.bullet3,
                    t.onboarding.notifStep.bullet4,
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 bg-muted/40 rounded-xl px-4 py-2.5 text-sm">
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {notifSupported ? (
                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
                      size="lg"
                      onClick={handleEnableNotifications}
                      disabled={notifLoading}
                      data-testid="button-enable-notifications"
                    >
                      {notifLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
                      {notifLoading ? t.onboarding.notifStep.enabling : t.onboarding.notifStep.enable}
                    </Button>
                  ) : (
                    <p className="text-xs text-center text-muted-foreground">
                      {t.onboarding.notifStep.unsupported}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => setStep("complete")}
                    data-testid="button-skip-notifications"
                  >
                    <BellOff className="w-4 h-4 mr-2" />
                    {t.onboarding.notifStep.skip}
                  </Button>
                </div>
              </CardContent>
            </Card>
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
