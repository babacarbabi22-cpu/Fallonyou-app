import { useCurrentUser, useUpdateProfile, useDeletePhoto, UserWithPhotos } from "@/hooks/use-danceme";
import { ProfileDetailSheet } from "@/components/ProfileDetailSheet";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, LogOut, Shield, User, Star, Plane, MapPin, Heart, Trash2, FileText, Mail, Briefcase, Eye } from "lucide-react";
import { useState, useRef, useEffect } from "react";
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
  });

  // Must be before any conditional returns
  const [isSettingProfilePic, setIsSettingProfilePic] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
      <div className="relative h-44 bg-gradient-to-br from-zinc-900 via-black to-zinc-800">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3">
            <Heart className="w-9 h-9 text-amber-400 fill-amber-400 animate-twinkle" />
            <Plane className="w-9 h-9 text-amber-400 fill-amber-400 animate-twinkle-delay-1 -rotate-45" />
            <span className="text-3xl font-display font-black text-amber-200 uppercase tracking-widest drop-shadow-lg">
              {formState.displayName || user.firstName || "You"}
            </span>
            <Plane className="w-9 h-9 text-amber-400 fill-amber-400 animate-twinkle-delay-2 rotate-45" />
            <Heart className="w-9 h-9 text-amber-400 fill-amber-400 animate-twinkle-delay-3" />
          </div>
        </div>

        {/* Profile photo */}
        <div className="absolute -bottom-12 left-6">
          <div className="relative w-24 h-24">
            <div className="absolute -inset-1.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full opacity-70" />
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

      <div className="mt-16 px-4 space-y-6">

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
                      onClick={() => deletePhoto(photo.id)}
                      className="rounded-full w-9 h-9"
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

          {user.isAdmin === "true" && (
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
