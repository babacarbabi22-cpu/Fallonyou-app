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
import { Camera, Upload, Check, ArrowRight, User, Heart, Shield, Sparkles, Loader2, Plane, Users, MapPin } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type OnboardingStep = "journey" | "profile" | "preferences" | "verification" | "complete";

const connectionTypeOptions = [
  { id: "friends", label: "Amigo/a", labelEn: "Friend", icon: Users, description: "Conocer gente nueva" },
  { id: "travel_buddy", label: "Compañero de viaje", labelEn: "Travel Buddy", icon: Plane, description: "Explorar juntos" },
  { id: "something_more", label: "Algo más", labelEn: "Something More", icon: Heart, description: "Conexión especial" },
];

const activityOptions = [
  { id: "explore_city", label: "Explorar la ciudad", labelEn: "Explore the city", icon: "🏛️" },
  { id: "food_drinks", label: "Comer y beber", labelEn: "Food & drinks", icon: "🍽️" },
  { id: "nightlife", label: "Vida nocturna", labelEn: "Nightlife", icon: "🎉" },
  { id: "outdoor", label: "Actividades al aire libre", labelEn: "Outdoor activities", icon: "🏔️" },
  { id: "beach", label: "Playa y relax", labelEn: "Beach & relax", icon: "🏖️" },
  { id: "culture", label: "Cultura y museos", labelEn: "Culture & museums", icon: "🎨" },
  { id: "sports", label: "Deportes", labelEn: "Sports", icon: "⚽" },
  { id: "shopping", label: "Compras", labelEn: "Shopping", icon: "🛍️" },
];


export default function OnboardingPage() {
  const t = useTranslation();
  const [, setLocation] = useLocation();
  const { data: user } = useCurrentUser();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { uploadFile, isUploading } = useUpload();
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

  const steps: OnboardingStep[] = ["journey", "profile", "preferences", "verification", "complete"];
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
    setStep("complete");
  };

  const handleComplete = () => {
    setLocation("/");
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
      // Auto-proceed to complete step after verification
      setStep("complete");
    },
    onError: () => {
      // If verification fails, still proceed
      setStep("complete");
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
                  <h2 className="text-2xl font-bold mb-2">¡Bienvenido a FallonYou!</h2>
                  <p className="text-muted-foreground">Cuéntanos sobre tu aventura</p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-3 block">¿Qué tipo de conexión buscas?</label>
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
                  <label className="text-sm font-medium mb-3 block">¿Qué actividad te gustaría realizar?</label>
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
                    <label className="text-sm font-medium mb-2 block">¿Dónde estás ahora?</label>
                    <Input
                      value={currentCity}
                      onChange={(e) => setCurrentCity(e.target.value)}
                      placeholder="Ej: Barcelona, España"
                      data-testid="input-current-city"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">¿A dónde vas? (opcional)</label>
                    <Input
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Ej: París, Francia"
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
                  Continuar
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

                {/* Photo upload */}
                <div className="flex justify-center">
                  <div
                    className="w-32 h-32 rounded-full bg-muted flex items-center justify-center cursor-pointer overflow-hidden border-4 border-dashed border-muted-foreground/30 hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Camera className="w-8 h-8" />
                        <span className="text-xs">{t.onboarding.uploadPhoto}</span>
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
                </div>
                <p className="text-xs text-center text-muted-foreground">{t.onboarding.photoTip}</p>

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

                <Button
                  onClick={handleProfileSubmit}
                  disabled={isPending || isUploading || !profileData.displayName}
                  className="w-full"
                  data-testid="button-next-step"
                >
                  {t.onboarding.next}
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

          {step === "complete" && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-10 h-10 text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{t.onboarding.step4Title}</h2>
                  <p className="text-muted-foreground">{t.onboarding.step4Desc}</p>
                </div>

                <div className="flex justify-center gap-2">
                  <Check className="w-5 h-5 text-amber-500" />
                  <span className="text-sm">{t.onboarding.step1Title}</span>
                </div>
                <div className="flex justify-center gap-2">
                  <Check className="w-5 h-5 text-amber-500" />
                  <span className="text-sm">{t.onboarding.step2Title}</span>
                </div>

                <Button onClick={handleComplete} className="w-full" size="lg" data-testid="button-finish-onboarding">
                  {t.onboarding.finish}
                  <Sparkles className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
