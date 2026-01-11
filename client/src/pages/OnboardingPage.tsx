import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/lib/i18n";
import { useUpdateProfile, useCurrentUser } from "@/hooks/use-danceme";
import { useUpload } from "@/hooks/use-upload";
import { useLocation } from "wouter";
import { Camera, Upload, Check, ArrowRight, User, Heart, Shield, Sparkles } from "lucide-react";

type OnboardingStep = "profile" | "preferences" | "verification" | "complete";

export default function OnboardingPage() {
  const t = useTranslation();
  const [, setLocation] = useLocation();
  const { data: user } = useCurrentUser();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { uploadFile, isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<OnboardingStep>("profile");
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

  const steps: OnboardingStep[] = ["profile", "preferences", "verification", "complete"];
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

  const stepIcons = {
    profile: User,
    preferences: Heart,
    verification: Shield,
    complete: Sparkles,
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
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
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
                    <Shield className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{t.onboarding.step3Title}</h2>
                  <p className="text-muted-foreground">{t.onboarding.step3Desc}</p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-4">{t.verification.instructions}</p>
                  <Button variant="outline" className="gap-2" data-testid="button-take-selfie">
                    <Camera className="w-4 h-4" />
                    {t.verification.takePhoto}
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">{t.verification.benefits}</p>

                <div className="space-y-2">
                  <Button onClick={() => setStep("complete")} className="w-full" data-testid="button-submit-verification">
                    {t.verification.submit}
                  </Button>
                  <Button variant="ghost" onClick={handleSkipVerification} className="w-full" data-testid="button-skip-verification">
                    {t.onboarding.skip}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "complete" && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{t.onboarding.step4Title}</h2>
                  <p className="text-muted-foreground">{t.onboarding.step4Desc}</p>
                </div>

                <div className="flex justify-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-sm">{t.onboarding.step1Title}</span>
                </div>
                <div className="flex justify-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
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
