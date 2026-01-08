import { useCurrentUser, useUpdateProfile, useDeletePhoto } from "@/hooks/use-danceme";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Camera, LogOut, Trash2 } from "lucide-react";
import { useState, useRef } from "react";
import { api } from "@shared/routes";

export default function ProfilePage() {
  const { data: user, isLoading } = useCurrentUser();
  const { logout } = useAuth();
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();
  const { mutate: deletePhoto } = useDeletePhoto();
  
  // Custom upload hook
  const { uploadFile, isUploading } = useUpload({
    onSuccess: async (response) => {
       // After uploading to object storage, we need to register it in our DB
       // This is a bit manual since the schema separates the two concepts
       // We'll call the standard photos API with the URL we got
       await fetch(api.photos.upload.path, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
           url: response.uploadURL.split('?')[0], // Clean URL without signatures for storage if public, or keep signature if needed
           type: 'image' 
         })
       });
       // Then refetch user
       window.location.reload(); // Simple reload to refresh data for now
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formState, setFormState] = useState({
    displayName: user?.displayName || "",
    bio: user?.bio || "",
    age: user?.age || 18,
    gender: user?.gender || "",
    preference: user?.preference || "",
  });

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!user) return null;

  const handleSave = () => {
    updateProfile({ id: user.id, ...formState });
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
        <div className="absolute top-4 right-4">
           <Button variant="destructive" size="sm" onClick={() => logout()} className="shadow-lg rounded-full">
             <LogOut className="w-4 h-4 mr-2" />
             Logout
           </Button>
        </div>
      </div>

      <div className="mt-16 px-6 space-y-8">
        {/* Info Section */}
        <section>
          <h2 className="text-2xl font-display font-bold mb-4">Edit Profile</h2>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium text-muted-foreground">Name</label>
                 <Input 
                   value={formState.displayName} 
                   onChange={(e) => setFormState({...formState, displayName: e.target.value})}
                   className="rounded-xl border-gray-200 focus:ring-primary/20"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium text-muted-foreground">Age</label>
                 <Input 
                   type="number" 
                   value={formState.age}
                   onChange={(e) => setFormState({...formState, age: parseInt(e.target.value)})}
                   className="rounded-xl border-gray-200 focus:ring-primary/20"
                 />
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Bio</label>
              <Textarea 
                value={formState.bio}
                onChange={(e) => setFormState({...formState, bio: e.target.value})}
                className="rounded-xl border-gray-200 focus:ring-primary/20 min-h-[100px]"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-sm font-medium text-muted-foreground">Gender</label>
                 <Input 
                   value={formState.gender}
                   onChange={(e) => setFormState({...formState, gender: e.target.value})}
                   className="rounded-xl border-gray-200 focus:ring-primary/20"
                   placeholder="e.g. Woman"
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-sm font-medium text-muted-foreground">Interested In</label>
                 <Input 
                   value={formState.preference}
                   onChange={(e) => setFormState({...formState, preference: e.target.value})}
                   className="rounded-xl border-gray-200 focus:ring-primary/20"
                   placeholder="e.g. Men"
                 />
               </div>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={isUpdating}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all mt-4"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </section>

        {/* Photos Section */}
        <section>
          <h2 className="text-xl font-display font-bold mb-4">My Photos</h2>
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
               <span className="text-xs font-bold">Add</span>
             </button>
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
