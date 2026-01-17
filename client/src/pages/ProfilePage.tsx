import { useCurrentUser, useUpdateProfile, useDeletePhoto, UserWithPhotos } from "@/hooks/use-danceme";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Camera, LogOut, Trash2, Globe, Shield, User, Star, Sparkles, Heart, GraduationCap, MapPin, Baby, Dog, Dumbbell, Wine, Cigarette, Eye, EyeOff } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import { VerificationStatus } from "@/components/VerificationBadge";
import { NotificationToggle } from "@/components/NotificationToggle";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Mail } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { ProfileDetailSheet } from "@/components/ProfileDetailSheet";

export default function ProfilePage() {
  const { data: user, isLoading } = useCurrentUser();
  const { logout } = useAuth();
  const t = useTranslation();
  const { toast } = useToast();
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();
  const { mutate: deletePhoto } = useDeletePhoto();
  
  // Custom upload hook
  const { uploadFile, isUploading } = useUpload({
    onSuccess: async (response) => {
       // Use objectPath which is the normalized path to access the file
       await fetch(api.photos.upload.path, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
           url: response.objectPath,
           type: 'image' 
         }),
         credentials: 'include'
       });
       window.location.reload();
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formState, setFormState] = useState({
    displayName: "",
    bio: "",
    age: 18,
    gender: "",
    preference: "",
    zodiacSign: "",
    smoking: "",
    drinking: "",
    children: "",
    education: "",
    occupation: "",
    birthplace: "",
    height: 0,
    religion: "",
    politics: "",
    pets: "",
    exercise: "",
    incognito: false,
  });

  useEffect(() => {
    if (user) {
      setFormState({
        displayName: user.displayName || user.firstName || "",
        bio: user.bio || user.profile?.bio || "",
        age: user.age || user.profile?.age || 18,
        gender: user.gender || user.profile?.gender || "",
        preference: user.preference || user.profile?.preference || "",
        zodiacSign: user.profile?.zodiacSign || "",
        smoking: user.profile?.smoking || "",
        drinking: user.profile?.drinking || "",
        children: user.profile?.children || "",
        education: user.profile?.education || "",
        occupation: user.profile?.occupation || "",
        birthplace: user.profile?.birthplace || "",
        height: user.profile?.height || 0,
        religion: user.profile?.religion || "",
        politics: user.profile?.politics || "",
        pets: user.profile?.pets || "",
        exercise: user.profile?.exercise || "",
        incognito: user.profile?.incognito || false,
      });
    }
  }, [user]);

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!user) return null;

  const handleSave = () => {
    updateProfile(formState, {
      onSuccess: () => {
        toast({
          title: t.profile.saved || "Profile saved",
          description: t.profile.savedDescription || "Your profile has been updated successfully",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to save profile. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const [isSettingProfilePic, setIsSettingProfilePic] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const setAsProfilePicture = async (photoUrl: string) => {
    setIsSettingProfilePic(true);
    try {
      const res = await fetch('/api/profile-image', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: photoUrl }),
        credentials: 'include'
      });
      if (res.ok) {
        toast({
          title: t.profile.profilePhotoSet || "Profile photo set",
          description: t.profile.profilePhotoSetDescription || "Your profile photo has been updated",
        });
        queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set profile photo",
        variant: "destructive",
      });
    } finally {
      setIsSettingProfilePic(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header Image / Cover */}
      <div className="relative h-48 bg-gradient-to-br from-primary to-secondary">
        <div className="absolute -bottom-12 left-6">
          <div className="relative w-24 h-24">
            <img 
              src={user.profileImageUrl || user.photos?.[0]?.url || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=200&auto=format&fit=crop&q=60"} 
              className="w-full h-full rounded-full object-cover border-4 border-background shadow-lg"
              alt="Profile"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform"
              data-testid="button-upload-photo"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,video/*"
              onChange={handleFileChange}
              data-testid="input-file-upload"
            />
          </div>
        </div>
        <div className="absolute -bottom-12 right-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowPreview(true)}
            className="shadow-lg rounded-full bg-background"
            data-testid="button-preview-profile"
          >
            <Eye className="w-4 h-4 mr-2" />
            {t.profile.previewProfile || "Ver perfil"}
          </Button>
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
           <LanguageSelector />
           <Button variant="destructive" size="sm" onClick={() => logout()} className="shadow-lg rounded-full" data-testid="button-logout">
             <LogOut className="w-4 h-4 mr-2" />
             {t.profile.logout}
           </Button>
        </div>
      </div>

      <div className="mt-16 px-6 space-y-8">
        {/* Info Section */}
        <section>
          <h2 className="text-2xl font-display font-bold mb-4">{t.profile.editProfile}</h2>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium text-muted-foreground">{t.profile.displayName}</label>
                 <Input 
                   value={formState.displayName} 
                   onChange={(e) => setFormState({...formState, displayName: e.target.value})}
                   className="rounded-xl border-gray-200 focus:ring-primary/20"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium text-muted-foreground">{t.profile.age}</label>
                 <Input 
                   type="number" 
                   value={formState.age}
                   onChange={(e) => setFormState({...formState, age: parseInt(e.target.value)})}
                   className="rounded-xl border-gray-200 focus:ring-primary/20"
                 />
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t.profile.bio}</label>
              <Textarea 
                value={formState.bio}
                onChange={(e) => setFormState({...formState, bio: e.target.value})}
                className="rounded-xl border-gray-200 focus:ring-primary/20 min-h-[100px]"
                placeholder={t.profile.bio}
                data-testid="input-bio"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium text-muted-foreground">{t.profile.gender}</label>
                 <Input 
                   value={formState.gender}
                   onChange={(e) => setFormState({...formState, gender: e.target.value})}
                   className="rounded-xl border-gray-200 focus:ring-primary/20"
                   placeholder={t.profile.gender}
                   data-testid="input-gender"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium text-muted-foreground">{t.profile.lookingFor}</label>
                 <Input 
                   value={formState.preference}
                   onChange={(e) => setFormState({...formState, preference: e.target.value})}
                   className="rounded-xl border-gray-200 focus:ring-primary/20"
                   placeholder={t.profile.lookingFor}
                   data-testid="input-preference"
                 />
               </div>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isUpdating}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all mt-4"
            >
              {isUpdating ? t.common.loading : t.profile.save}
            </Button>
          </div>
        </section>

        {/* Incognito Mode */}
        <section>
          <Card className={formState.incognito ? "border-primary bg-primary/5" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formState.incognito ? 'bg-primary text-white' : 'bg-muted'}`}>
                    {formState.incognito ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="font-medium">{t.profileDetails?.incognito || "Incognito Mode"}</p>
                    <p className="text-sm text-muted-foreground">{t.profileDetails?.incognitoDesc || "Browse profiles without being seen"}</p>
                  </div>
                </div>
                <Switch 
                  checked={formState.incognito}
                  onCheckedChange={(checked) => setFormState({...formState, incognito: checked})}
                  data-testid="switch-incognito"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Basics Section */}
        <section>
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t.profileDetails?.basics || "Basics"}
          </h2>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">{t.profileDetails?.zodiac || "Zodiac Sign"}</label>
                <Select value={formState.zodiacSign} onValueChange={(v) => setFormState({...formState, zodiacSign: v})}>
                  <SelectTrigger className="rounded-xl" data-testid="select-zodiac">
                    <SelectValue placeholder={t.profileDetails?.selectZodiac || "Select sign"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aries">{t.zodiac?.aries || "Aries"}</SelectItem>
                    <SelectItem value="taurus">{t.zodiac?.taurus || "Taurus"}</SelectItem>
                    <SelectItem value="gemini">{t.zodiac?.gemini || "Gemini"}</SelectItem>
                    <SelectItem value="cancer">{t.zodiac?.cancer || "Cancer"}</SelectItem>
                    <SelectItem value="leo">{t.zodiac?.leo || "Leo"}</SelectItem>
                    <SelectItem value="virgo">{t.zodiac?.virgo || "Virgo"}</SelectItem>
                    <SelectItem value="libra">{t.zodiac?.libra || "Libra"}</SelectItem>
                    <SelectItem value="scorpio">{t.zodiac?.scorpio || "Scorpio"}</SelectItem>
                    <SelectItem value="sagittarius">{t.zodiac?.sagittarius || "Sagittarius"}</SelectItem>
                    <SelectItem value="capricorn">{t.zodiac?.capricorn || "Capricorn"}</SelectItem>
                    <SelectItem value="aquarius">{t.zodiac?.aquarius || "Aquarius"}</SelectItem>
                    <SelectItem value="pisces">{t.zodiac?.pisces || "Pisces"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">{t.profileDetails?.height || "Height (cm)"}</label>
                <Input 
                  type="number"
                  value={formState.height || ""}
                  onChange={(e) => setFormState({...formState, height: parseInt(e.target.value) || 0})}
                  className="rounded-xl"
                  placeholder="175"
                  data-testid="input-height"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  {t.profileDetails?.education || "Education"}
                </label>
                <Select value={formState.education} onValueChange={(v) => setFormState({...formState, education: v})}>
                  <SelectTrigger className="rounded-xl" data-testid="select-education">
                    <SelectValue placeholder={t.profileDetails?.selectEducation || "Select level"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high_school">{t.education?.highSchool || "High School"}</SelectItem>
                    <SelectItem value="some_college">{t.education?.someCollege || "Some College"}</SelectItem>
                    <SelectItem value="bachelors">{t.education?.bachelors || "Bachelor's Degree"}</SelectItem>
                    <SelectItem value="masters">{t.education?.masters || "Master's Degree"}</SelectItem>
                    <SelectItem value="doctorate">{t.education?.doctorate || "Doctorate"}</SelectItem>
                    <SelectItem value="trade_school">{t.education?.tradeSchool || "Trade School"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">{t.profileDetails?.occupation || "Occupation"}</label>
                <Input 
                  value={formState.occupation}
                  onChange={(e) => setFormState({...formState, occupation: e.target.value})}
                  className="rounded-xl"
                  placeholder={t.profileDetails?.occupationPlaceholder || "What do you do?"}
                  data-testid="input-occupation"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t.profileDetails?.birthplace || "Birthplace"}
              </label>
              <Input 
                value={formState.birthplace}
                onChange={(e) => setFormState({...formState, birthplace: e.target.value})}
                className="rounded-xl"
                placeholder={t.profileDetails?.birthplacePlaceholder || "Where are you from?"}
                data-testid="input-birthplace"
              />
            </div>
          </div>
        </section>

        {/* Lifestyle Section */}
        <section>
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            {t.profileDetails?.lifestyle || "Lifestyle"}
          </h2>
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Cigarette className="w-4 h-4" />
                  {t.profileDetails?.smoking || "Smoking"}
                </label>
                <Select value={formState.smoking} onValueChange={(v) => setFormState({...formState, smoking: v})}>
                  <SelectTrigger className="rounded-xl" data-testid="select-smoking">
                    <SelectValue placeholder={t.profileDetails?.select || "Select"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">{t.lifestyle?.never || "Never"}</SelectItem>
                    <SelectItem value="sometimes">{t.lifestyle?.sometimes || "Sometimes"}</SelectItem>
                    <SelectItem value="regularly">{t.lifestyle?.regularly || "Regularly"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wine className="w-4 h-4" />
                  {t.profileDetails?.drinking || "Drinking"}
                </label>
                <Select value={formState.drinking} onValueChange={(v) => setFormState({...formState, drinking: v})}>
                  <SelectTrigger className="rounded-xl" data-testid="select-drinking">
                    <SelectValue placeholder={t.profileDetails?.select || "Select"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">{t.lifestyle?.never || "Never"}</SelectItem>
                    <SelectItem value="socially">{t.lifestyle?.socially || "Socially"}</SelectItem>
                    <SelectItem value="regularly">{t.lifestyle?.regularly || "Regularly"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  {t.profileDetails?.exercise || "Exercise"}
                </label>
                <Select value={formState.exercise} onValueChange={(v) => setFormState({...formState, exercise: v})}>
                  <SelectTrigger className="rounded-xl" data-testid="select-exercise">
                    <SelectValue placeholder={t.profileDetails?.select || "Select"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">{t.lifestyle?.never || "Never"}</SelectItem>
                    <SelectItem value="sometimes">{t.lifestyle?.sometimes || "Sometimes"}</SelectItem>
                    <SelectItem value="active">{t.lifestyle?.active || "Active"}</SelectItem>
                    <SelectItem value="daily">{t.lifestyle?.daily || "Daily"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        {/* Family & Future Section */}
        <section>
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Baby className="w-5 h-5 text-primary" />
            {t.profileDetails?.familyFuture || "Family & Future"}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t.profileDetails?.children || "Children"}</label>
              <Select value={formState.children} onValueChange={(v) => setFormState({...formState, children: v})}>
                <SelectTrigger className="rounded-xl" data-testid="select-children">
                  <SelectValue placeholder={t.profileDetails?.select || "Select"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="want">{t.children?.want || "Want someday"}</SelectItem>
                  <SelectItem value="dont_want">{t.children?.dontWant || "Don't want"}</SelectItem>
                  <SelectItem value="have">{t.children?.have || "Have & want more"}</SelectItem>
                  <SelectItem value="have_done">{t.children?.haveDone || "Have & don't want more"}</SelectItem>
                  <SelectItem value="not_sure">{t.children?.notSure || "Not sure yet"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Dog className="w-4 h-4" />
                {t.profileDetails?.pets || "Pets"}
              </label>
              <Select value={formState.pets} onValueChange={(v) => setFormState({...formState, pets: v})}>
                <SelectTrigger className="rounded-xl" data-testid="select-pets">
                  <SelectValue placeholder={t.profileDetails?.select || "Select"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dog">{t.pets?.dog || "Dog"}</SelectItem>
                  <SelectItem value="cat">{t.pets?.cat || "Cat"}</SelectItem>
                  <SelectItem value="both">{t.pets?.both || "Dog & Cat"}</SelectItem>
                  <SelectItem value="other">{t.pets?.other || "Other pets"}</SelectItem>
                  <SelectItem value="want">{t.pets?.want || "Want a pet"}</SelectItem>
                  <SelectItem value="allergic">{t.pets?.allergic || "Allergic"}</SelectItem>
                  <SelectItem value="none">{t.pets?.none || "No pets"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Religion & Politics Section */}
        <section>
          <h2 className="text-xl font-display font-bold mb-4">{t.profileDetails?.beliefs || "Beliefs"}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t.profileDetails?.religion || "Religion"}</label>
              <Select value={formState.religion} onValueChange={(v) => setFormState({...formState, religion: v})}>
                <SelectTrigger className="rounded-xl" data-testid="select-religion">
                  <SelectValue placeholder={t.profileDetails?.select || "Select"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agnostic">{t.religion?.agnostic || "Agnostic"}</SelectItem>
                  <SelectItem value="atheist">{t.religion?.atheist || "Atheist"}</SelectItem>
                  <SelectItem value="buddhist">{t.religion?.buddhist || "Buddhist"}</SelectItem>
                  <SelectItem value="catholic">{t.religion?.catholic || "Catholic"}</SelectItem>
                  <SelectItem value="christian">{t.religion?.christian || "Christian"}</SelectItem>
                  <SelectItem value="hindu">{t.religion?.hindu || "Hindu"}</SelectItem>
                  <SelectItem value="jewish">{t.religion?.jewish || "Jewish"}</SelectItem>
                  <SelectItem value="muslim">{t.religion?.muslim || "Muslim"}</SelectItem>
                  <SelectItem value="spiritual">{t.religion?.spiritual || "Spiritual"}</SelectItem>
                  <SelectItem value="other">{t.religion?.other || "Other"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t.profileDetails?.politics || "Politics"}</label>
              <Select value={formState.politics} onValueChange={(v) => setFormState({...formState, politics: v})}>
                <SelectTrigger className="rounded-xl" data-testid="select-politics">
                  <SelectValue placeholder={t.profileDetails?.select || "Select"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="liberal">{t.politics?.liberal || "Liberal"}</SelectItem>
                  <SelectItem value="moderate">{t.politics?.moderate || "Moderate"}</SelectItem>
                  <SelectItem value="conservative">{t.politics?.conservative || "Conservative"}</SelectItem>
                  <SelectItem value="apolitical">{t.politics?.apolitical || "Apolitical"}</SelectItem>
                  <SelectItem value="other">{t.politics?.other || "Other"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Verification & Notifications Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-display font-bold mb-4">{t.settings.title}</h2>
          <VerificationStatus />
          <NotificationToggle />
          
          {/* Legal & Support */}
          <Link href="/legal">
            <Card className="border-dashed cursor-pointer hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{t.legal.title}</p>
                    <p className="text-sm text-muted-foreground">{t.legal.terms} & {t.legal.privacy}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{t.settings.support}</p>
                  <p className="text-sm text-muted-foreground">{t.settings.contactEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Photos Section */}
        <section>
          <h2 className="text-xl font-display font-bold mb-4">{t.profile.photos}</h2>
          <p className="text-sm text-muted-foreground mb-3">{t.profile.tapToSetProfile || "Tap a photo to set as profile picture"}</p>
          <div className="grid grid-cols-3 gap-3">
             {user.photos?.map((photo) => {
               const isProfilePic = user.profileImageUrl === photo.url;
               return (
                 <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden group">
                   <img src={photo.url} className="w-full h-full object-cover" alt="User photo" />
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
                       className="rounded-full"
                       title={t.profile.setAsProfile || "Set as profile picture"}
                       data-testid={`button-set-profile-${photo.id}`}
                     >
                       <User className="w-4 h-4" />
                     </Button>
                     <Button 
                       size="icon"
                       variant="destructive"
                       onClick={() => deletePhoto(photo.id)}
                       className="rounded-full"
                       title={t.profile.deletePhoto || "Delete photo"}
                       data-testid={`button-delete-photo-${photo.id}`}
                     >
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                 </div>
               );
             })}
             {/* Add button placeholder */}
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors bg-gray-50"
               data-testid="button-add-photo"
             >
               <Camera className="w-6 h-6 mb-1" />
               <span className="text-xs font-bold">{t.profile.addPhoto}</span>
             </button>
          </div>
        </section>
      </div>

      {/* Profile Preview Sheet */}
      <ProfileDetailSheet 
        user={user ? {
          id: user.id,
          firstName: user.displayName || user.firstName || "User",
          profileImageUrl: user.profileImageUrl || user.photos?.[0]?.url || null,
          photos: user.photos || [],
          profile: {
            bio: user.bio || user.profile?.bio || null,
            age: user.age || user.profile?.age || null,
            gender: user.gender || user.profile?.gender || null,
            zodiacSign: user.profile?.zodiacSign || null,
            birthplace: user.profile?.birthplace || null,
            occupation: user.profile?.occupation || null,
            height: user.profile?.height || null,
            education: user.profile?.education || null,
            smoking: user.profile?.smoking || null,
            drinking: user.profile?.drinking || null,
            exercise: user.profile?.exercise || null,
            children: user.profile?.children || null,
            pets: user.profile?.pets || null,
            religion: user.profile?.religion || null,
            politics: user.profile?.politics || null,
          }
        } as UserWithPhotos : null}
        open={showPreview}
        onOpenChange={setShowPreview}
      />

      <BottomNav />
    </div>
  );
}
