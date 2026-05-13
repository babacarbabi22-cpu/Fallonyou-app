import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { Link } from "wouter";
import { ArrowLeft, Camera, MapPin, X, Loader2, Trash2, Image } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-danceme";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface AlbumPhoto {
  id: number;
  photoUrl: string;
  caption: string | null;
  city: string | null;
  createdAt: string;
  userId: string;
  firstName: string | null;
  profileImageUrl: string | null;
}

export default function AlbumPage() {
  const { toast } = useToast();
  const { data: currentUser } = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState("");
  const [city, setCity] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { uploadFile, isUploading } = useUpload();

  const { data, isLoading } = useQuery<{ photos: AlbumPhoto[] }>({
    queryKey: ["/api/album"],
    staleTime: 60 * 1000,
  });

  const photos = data?.photos ?? [];

  const postMutation = useMutation({
    mutationFn: async ({ photoUrl, caption, city }: { photoUrl: string; caption: string; city: string }) =>
      apiRequest("POST", "/api/album", { photoUrl, caption, city }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/album"] });
      setShowUpload(false);
      setCaption("");
      setCity("");
      setPreviewUrl(null);
      setSelectedFile(null);
      toast({ title: "¡Foto publicada!", description: "Tu aventura ya está en el álbum de la comunidad." });
    },
    onError: () => toast({ title: "Error al publicar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/album/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/album"] });
      toast({ title: "Foto eliminada" });
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowUpload(true);
  }

  async function handlePublish() {
    if (!selectedFile) return;
    const result = await uploadFile(selectedFile);
    if (!result?.objectPath) return;
    await postMutation.mutateAsync({ photoUrl: result.objectPath, caption, city });
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors" data-testid="button-back-album">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold leading-tight">Álbum de aventuras</h1>
          <p className="text-xs text-muted-foreground">Fotos reales de la comunidad FallonYou</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-black"
          style={{ background: "linear-gradient(90deg,#D97706,#F59E0B)" }}
          data-testid="button-add-photo"
        >
          <Camera className="w-3.5 h-3.5" /> Añadir
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Upload sheet */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full rounded-t-3xl p-5 space-y-4"
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
              data-testid="sheet-upload-photo"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-base">Publicar en el álbum</h3>
                <button onClick={() => setShowUpload(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {previewUrl && (
                <div className="w-full aspect-square rounded-2xl overflow-hidden max-h-64">
                  <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}
              <input
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Describe tu aventura... (opcional)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50"
                data-testid="input-photo-caption"
                maxLength={200}
              />
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Ciudad o destino (opcional)"
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  data-testid="input-photo-city"
                />
              </div>
              <button
                onClick={handlePublish}
                disabled={isUploading || postMutation.isPending}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-black disabled:opacity-50"
                style={{ background: "linear-gradient(90deg,#D97706,#F59E0B)" }}
                data-testid="button-publish-photo"
              >
                {isUploading || postMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Publicando...
                  </span>
                ) : "Publicar en el álbum"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed */}
      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Image className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold mb-1">El álbum está vacío</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Sé el primero en compartir una foto de tu aventura con la comunidad
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-full text-sm font-bold text-black"
              style={{ background: "linear-gradient(90deg,#D97706,#F59E0B)" }}
            >
              📸 Añadir primera foto
            </button>
          </div>
        ) : (
          <div className="columns-2 gap-2 space-y-2">
            {photos.map((photo, i) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="break-inside-avoid rounded-2xl overflow-hidden relative group"
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                data-testid={`album-photo-${photo.id}`}
              >
                <img
                  src={photo.photoUrl}
                  alt={photo.caption || "Aventura"}
                  className="w-full object-cover"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  {photo.city && (
                    <div className="flex items-center gap-1 mb-1">
                      <MapPin className="w-2.5 h-2.5 text-amber-400" />
                      <span className="text-[10px] font-semibold text-amber-300">{photo.city}</span>
                    </div>
                  )}
                  {photo.caption && (
                    <p className="text-[11px] text-white leading-snug line-clamp-2 mb-1.5">{photo.caption}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={photo.profileImageUrl || ""} />
                        <AvatarFallback className="text-[8px]">{photo.firstName?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-white/80">{photo.firstName || "Viajero"}</span>
                    </div>
                    <span className="text-[9px] text-white/50">
                      {formatDistanceToNow(new Date(photo.createdAt), { locale: es, addSuffix: true })}
                    </span>
                  </div>
                </div>
                {/* Delete button (only own photos) */}
                {photo.userId === currentUser?.id && (
                  <button
                    onClick={() => deleteMutation.mutate(photo.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`button-delete-photo-${photo.id}`}
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
