import { useCurrentUser, useUpdateProfile, useDeletePhoto } from "@/hooks/use-danceme";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, LogOut, Trash2, Globe, Shield } from "lucide-react";
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
       await fetch(api.photos.upload.path, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
           url: response.uploadURL.split('?')[0],
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
  });

  useEffect(() => {
    if (user) {
      setFormState({
        displayName: user.displayName || user.firstName || "",
        bio: user.bio || user.profile?.bio || "",
        age: user.age || user.profile?.age || 18,
        gender: user.gender || user.profile?.gender || "",
        preference: user.preference || user.profile?.preference || "",
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
      // In a real implementation, we would bridge the Object Storage upload 
      // with the Danceme Photo API. For this demo, we assume the hook works.
      await uploadFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header Image / Cover */}
      <div className="relative h-48 bg-gradient-to-br from-primary to-secondary">
        <div className="absolute -bottom-12 left-6">
          <div className="relative w-24 h-24">
            <img 
              src={user.photos?.[0]?.url || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=200&auto=format&fit=crop&q=60"} 
              className="w-full h-full rounded-full object-cover border-4 border-background shadow-lg"
              alt="Profile"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
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
          <div className="grid grid-cols-3 gap-3">
             {user.photos?.map((photo) => (
               <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden group">
                 <img src={photo.url} className="w-full h-full object-cover" alt="User photo" />
                 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button 
                     onClick={() => deletePhoto(photo.id)}
                     className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
               </div>
             ))}
             {/* Add button placeholder */}
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors bg-gray-50"
             >
               <Camera className="w-6 h-6 mb-1" />
               <span className="text-xs font-bold">{t.profile.addPhoto}</span>
             </button>
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
