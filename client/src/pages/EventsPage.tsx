import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar, MapPin, Users, Plus, Clock, Loader2, Trash2, Pencil, ImagePlus, X, Search, MessageCircle, Image, Sparkles, Bell, ArrowRight, Building2, ChevronRight, Tag, Copy, Check, Store } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { NotificationBell } from "@/components/NotificationBell";
import { StoriesRow } from "@/components/StoriesRow";
import { WelcomeTour } from "@/components/WelcomeTour";
import { SocialProofTicker } from "@/components/SocialProofTicker";
import { InviteFriends } from "@/components/InviteFriends";
import { CityAdsCarousel } from "@/components/CityAdsCarousel";
import { useCurrentUser } from "@/hooks/use-danceme";
import { useUpload } from "@/hooks/use-upload";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { format } from "date-fns";

const eventCategories = [
  { id: "dining", label: "Dining", icon: "🍽️" },
  { id: "nightlife", label: "Nightlife", icon: "🎉" },
  { id: "outdoor", label: "Outdoor", icon: "🏔️" },
  { id: "culture", label: "Culture", icon: "🎭" },
  { id: "sports", label: "Sports", icon: "⚽" },
  { id: "travel", label: "Travel", icon: "✈️" },
  { id: "music", label: "Music", icon: "🎵" },
  { id: "other", label: "Other", icon: "📌" },
];

const categoryImages: Record<string, string> = {
  dining: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=300&fit=crop",
  nightlife: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=600&h=300&fit=crop",
  outdoor: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=300&fit=crop",
  culture: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=600&h=300&fit=crop",
  sports: "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=600&h=300&fit=crop",
  travel: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=300&fit=crop",
  music: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=300&fit=crop",
  other: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=300&fit=crop",
};

interface Event {
  id: number;
  title: string;
  description: string | null;
  category: string;
  city: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  imageUrl: string | null;
  creatorId: string;
  participantCount: number;
  isParticipant: boolean;
  participantAvatars: { id: string; firstName: string | null; profileImageUrl: string | null }[];
  creator: {
    id: string;
    firstName: string | null;
    profileImageUrl: string | null;
  } | null;
}

// ── Countdown component ──────────────────────────────────────────────────────
function useCountdown(targetDate: string) {
  const getRemaining = useCallback(() => {
    const diff = new Date(targetDate).getTime() - Date.now();
    if (diff <= 0) return null;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return { days, hours, mins, secs, diff };
  }, [targetDate]);

  const [remaining, setRemaining] = useState<ReturnType<typeof getRemaining>>(getRemaining);
  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining()), 1000);
    return () => clearInterval(id);
  }, [getRemaining]);
  return remaining;
}

function EventCountdown({ startsAt }: { startsAt: string }) {
  const r = useCountdown(startsAt);
  if (!r) return null;
  const urgent = r.diff < 3 * 3600000;
  const soon = r.diff < 24 * 3600000;
  const parts = r.days > 0
    ? `${r.days}d ${r.hours}h`
    : r.hours > 0
      ? `${r.hours}h ${r.mins}m`
      : `${r.mins}m ${r.secs}s`;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
        urgent ? "bg-red-500/15 text-red-500"
        : soon ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
        : "bg-green-500/10 text-green-600 dark:text-green-400"
      }`}
      data-testid="event-countdown"
    >
      ⏳ {parts}
    </span>
  );
}

type EventFormData = {
  title: string;
  description: string;
  category: string;
  city: string;
  location: string;
  startsAt: string;
  capacity: string;
  imageUrl: string;
};

const galleryImages: Record<string, { url: string; label: string }[]> = {
  dining: [
    { url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop", label: "Restaurant" },
    { url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop", label: "Fine dining" },
    { url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=400&fit=crop", label: "Food platter" },
    { url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=400&fit=crop", label: "Casual dining" },
    { url: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=400&fit=crop", label: "Wine & dine" },
    { url: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=400&fit=crop", label: "Brunch" },
  ],
  nightlife: [
    { url: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&h=400&fit=crop", label: "Night city" },
    { url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop", label: "Party" },
    { url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=400&fit=crop", label: "DJ" },
    { url: "https://images.unsplash.com/photo-1571204829887-3b8d69e4094d?w=800&h=400&fit=crop", label: "Cocktails" },
    { url: "https://images.unsplash.com/photo-1545128485-c400e7702712?w=800&h=400&fit=crop", label: "Rooftop bar" },
    { url: "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&h=400&fit=crop", label: "Dance floor" },
  ],
  outdoor: [
    { url: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=400&fit=crop", label: "Hiking" },
    { url: "https://images.unsplash.com/photo-1533692328991-08159ff19fca?w=800&h=400&fit=crop", label: "Beach sunset" },
    { url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=400&fit=crop", label: "Mountain view" },
    { url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop", label: "Peak" },
    { url: "https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?w=800&h=400&fit=crop", label: "Park picnic" },
    { url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=400&fit=crop", label: "Camping" },
  ],
  culture: [
    { url: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=400&fit=crop", label: "Art gallery" },
    { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop", label: "Museum" },
    { url: "https://images.unsplash.com/photo-1460881680858-30d872d5b530?w=800&h=400&fit=crop", label: "Theater" },
    { url: "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800&h=400&fit=crop", label: "Exhibition" },
    { url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=400&fit=crop", label: "Street art" },
    { url: "https://images.unsplash.com/photo-1569317002804-ab77bcf1bce4?w=800&h=400&fit=crop", label: "Festival" },
  ],
  sports: [
    { url: "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=800&h=400&fit=crop", label: "Beach sports" },
    { url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=400&fit=crop", label: "Football" },
    { url: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&h=400&fit=crop", label: "Yoga" },
    { url: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&h=400&fit=crop", label: "Swimming" },
    { url: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&h=400&fit=crop", label: "Volleyball" },
    { url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=400&fit=crop", label: "Gym" },
  ],
  travel: [
    { url: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=400&fit=crop", label: "Journey" },
    { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=400&fit=crop", label: "Tropical beach" },
    { url: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=400&fit=crop", label: "Road trip" },
    { url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=400&fit=crop", label: "Lake" },
    { url: "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=800&h=400&fit=crop", label: "City travel" },
    { url: "https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&h=400&fit=crop", label: "Airport" },
  ],
  music: [
    { url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop", label: "Concert" },
    { url: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=400&fit=crop", label: "Festival" },
    { url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800&h=400&fit=crop", label: "Guitar" },
    { url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=400&fit=crop", label: "Live music" },
    { url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&h=400&fit=crop", label: "Crowd" },
    { url: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&h=400&fit=crop", label: "Vinyl" },
  ],
  other: [
    { url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop", label: "Friends" },
    { url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=400&fit=crop", label: "Celebration" },
    { url: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&h=400&fit=crop", label: "Group" },
    { url: "https://images.unsplash.com/photo-1522543558187-768b6df7c25c?w=800&h=400&fit=crop", label: "Meetup" },
    { url: "https://images.unsplash.com/photo-1496024840928-4c417adf211d?w=800&h=400&fit=crop", label: "Sunset" },
    { url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=400&fit=crop", label: "Relax" },
  ],
};

function EventForm({
  formData,
  setFormData,
  onSubmit,
  isPending,
  submitLabel,
  hideButton,
}: {
  formData: EventFormData;
  setFormData: (data: EventFormData) => void;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel: string;
  hideButton?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(formData.imageUrl || null);
  const [showGallery, setShowGallery] = useState(false);
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      const objectUrl = response.objectPath.startsWith("/objects/")
        ? response.objectPath
        : `/objects/${response.objectPath}`;
      setFormData({ ...formData, imageUrl: objectUrl });
      setImagePreview(objectUrl);
    },
  });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    await uploadFile(file);
  };

  const removeImage = () => {
    setFormData({ ...formData, imageUrl: "" });
    setImagePreview(null);
    setShowGallery(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectGalleryImage = (url: string) => {
    setFormData({ ...formData, imageUrl: url });
    setImagePreview(url);
    setShowGallery(false);
  };

  const currentGallery = galleryImages[formData.category] || galleryImages.other;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Cover Photo (optional)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          data-testid="input-event-image"
        />
        {imagePreview ? (
          <div className="relative mt-2 rounded-xl overflow-hidden">
            <img src={imagePreview} alt="Event cover" className="w-full h-40 object-cover" />
            <div className="absolute top-2 right-2 flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0 rounded-full bg-white/90 hover:bg-white"
                onClick={() => {
                  setFormData({ ...formData, imageUrl: "" });
                  setImagePreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  setShowGallery(true);
                }}
                type="button"
                data-testid="button-change-event-image"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 w-8 p-0 rounded-full"
                onClick={removeImage}
                type="button"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
          </div>
        ) : !showGallery ? (
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1 h-20 border-dashed flex flex-col gap-1"
              onClick={() => fileInputRef.current?.click()}
              type="button"
              disabled={isUploading}
              data-testid="button-add-event-image"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Upload</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-20 border-dashed flex flex-col gap-1"
              onClick={() => setShowGallery(true)}
              type="button"
              data-testid="button-open-gallery"
            >
              <Image className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Gallery</span>
            </Button>
          </div>
        ) : (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Choose a cover image</span>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setShowGallery(false)} type="button">
                Cancel
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
              {currentGallery.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="relative rounded-lg overflow-hidden aspect-video hover:ring-2 hover:ring-amber-500 transition-all"
                  onClick={() => selectGalleryImage(img.url)}
                  data-testid={`gallery-image-${idx}`}
                >
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] py-0.5 text-center">{img.label}</span>
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => { setShowGallery(false); fileInputRef.current?.click(); }}
              type="button"
            >
              <ImagePlus className="w-3.5 h-3.5 mr-1" /> Upload my own photo
            </Button>
          </div>
        )}
      </div>
      <div>
        <label className="text-sm font-medium">Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="What's the plan?"
          data-testid="input-event-title"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Category</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {eventCategories.map((cat) => (
            <Button
              key={cat.id}
              variant={formData.category === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFormData({ ...formData, category: cat.id })}
              className={formData.category === cat.id ? "bg-amber-500 hover:bg-amber-600" : ""}
            >
              {cat.icon} {cat.label}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">City</label>
        <Input
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          placeholder="Barcelona, Spain"
          data-testid="input-event-city"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Location (optional)</label>
        <Input
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="Restaurant name, address..."
          data-testid="input-event-location"
        />
      </div>
      <div>
        <label className="text-sm font-medium">When</label>
        <div className="flex gap-2">
          <Input
            type="date"
            value={formData.startsAt ? formData.startsAt.split("T")[0] : ""}
            onChange={(e) => {
              const date = e.target.value;
              const time = formData.startsAt ? formData.startsAt.split("T")[1] : "12:00";
              setFormData({ ...formData, startsAt: date && time ? `${date}T${time}` : date ? `${date}T12:00` : "" });
            }}
            className="flex-1"
            data-testid="input-event-date"
          />
          <Input
            type="time"
            value={formData.startsAt ? formData.startsAt.split("T")[1] ?? "" : ""}
            onChange={(e) => {
              const time = e.target.value;
              const date = formData.startsAt ? formData.startsAt.split("T")[0] : "";
              setFormData({ ...formData, startsAt: date && time ? `${date}T${time}` : "" });
            }}
            className="w-32"
            data-testid="input-event-time"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Max participants (optional)</label>
        <Input
          type="number"
          value={formData.capacity}
          onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
          placeholder="Sin límite"
          min={2}
          data-testid="input-event-capacity"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Description (optional)</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Tell people more about this activity..."
          rows={3}
          data-testid="input-event-description"
        />
      </div>
      {!hideButton && (
        <Button
          onClick={onSubmit}
          disabled={!formData.title.trim() || !formData.city.trim() || !formData.startsAt || isPending || isUploading}
          className="w-full bg-amber-500 hover:bg-amber-600"
          data-testid="button-submit-event"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
        </Button>
      )}
    </div>
  );
}

const emptyForm: EventFormData = {
  title: "",
  description: "",
  category: "other",
  city: "",
  location: "",
  startsAt: "",
  capacity: "",
  imageUrl: "",
};

export default function EventsPage() {
  const { data: currentUser } = useCurrentUser();
  const [, navigate] = useLocation();
  const [deleteConfirmEventId, setDeleteConfirmEventId] = useState<number | null>(null);
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [showNotifBanner, setShowNotifBanner] = useState(() => {
    return !localStorage.getItem("fallonyou_notif_banner_dismissed");
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    if (isCreateOpen) {
      const city = (currentUser as any)?.profile?.currentCity || (currentUser as any)?.profile?.homeCity || "";
      if (city) setNewEvent(f => ({ ...f, city }));
    }
  }, [isCreateOpen]);
  const { isSupported, isSubscribed, subscribe } = usePushNotifications();
  const [notifBannerLoading, setNotifBannerLoading] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showMyEvents, setShowMyEvents] = useState(false);
  const [showDeals, setShowDeals] = useState(false);
  const [copiedCode, setCopiedCode] = useState<number | null>(null);
  const [citySearch, setCitySearch] = useState("");
  const [showCitySearch, setShowCitySearch] = useState(false);
  const [newEvent, setNewEvent] = useState<EventFormData>({ ...emptyForm });
  const [editForm, setEditForm] = useState<EventFormData>({ ...emptyForm });

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("fallonyou_tour_completed");
    if (!hasSeenTour) {
      setShowWelcomeTour(true);
    }
  }, []);

  const handleTourComplete = () => {
    localStorage.setItem("fallonyou_tour_completed", "true");
    setShowWelcomeTour(false);
  };

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", selectedCategory],
  });

  interface Offer {
    id: number;
    title: string;
    description: string;
    discount: string | null;
    code: string | null;
    validUntil: string | null;
    partnerName: string;
    partnerCity: string;
    partnerCategory: string;
    partnerLogo: string | null;
  }
  const { data: offers, isLoading: offersLoading } = useQuery<Offer[]>({
    queryKey: ["/api/offers"],
    enabled: showDeals,
  });

  const { data: suggestionsData } = useQuery<{
    suggestions: (Event & { creator: { id: string; firstName: string | null; profileImageUrl: string | null } | null })[];
    city: string | null;
  }>({
    queryKey: ["/api/events/suggestions"],
    queryFn: async () => {
      const res = await fetch("/api/events/suggestions", { credentials: "include" });
      if (!res.ok) return { suggestions: [], city: null };
      return res.json();
    },
  });

  // Convert a local datetime string ("YYYY-MM-DDTHH:mm") to a proper UTC ISO string
  // so the server stores the correct UTC value regardless of timezone offset.
  const localToUtcIso = (localStr: string) => {
    if (!localStr) return localStr;
    const d = new Date(localStr); // browser treats as local time
    return isNaN(d.getTime()) ? localStr : d.toISOString();
  };

  const createEventMutation = useMutation({
    mutationFn: async (eventData: EventFormData) => {
      const res = await apiRequest("POST", "/api/events", {
        ...eventData,
        startsAt: localToUtcIso(eventData.startsAt),
        capacity: eventData.capacity ? parseInt(eventData.capacity) : null,
        imageUrl: eventData.imageUrl || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsCreateOpen(false);
      setNewEvent({ ...emptyForm });
    },
  });

  const editEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EventFormData }) => {
      const res = await apiRequest("PATCH", `/api/events/${id}`, {
        ...data,
        startsAt: localToUtcIso(data.startsAt),
        capacity: data.capacity ? parseInt(data.capacity) : null,
        imageUrl: data.imageUrl || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setEditingEvent(null);
    },
  });

  const joinEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/join`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      await apiRequest("DELETE", `/api/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const isPastEvent = (startsAt: string) => {
    return new Date(startsAt) < new Date();
  };

  const isCreatorOrAdmin = (event: Event) => {
    if (!currentUser) return false;
    // Admin can manage any event
    if (currentUser.isAdmin === 'true') return true;
    // Compare using creatorId directly (most reliable)
    if (event.creatorId && String(event.creatorId) === String(currentUser.id)) return true;
    // Fallback: compare via nested creator object
    if (event.creator && String(event.creator.id) === String(currentUser.id)) return true;
    return false;
  };

  const openEditDialog = (event: Event) => {
    const startsAtLocal = format(new Date(event.startsAt), "yyyy-MM-dd'T'HH:mm");
    setEditForm({
      title: event.title,
      description: event.description || "",
      category: event.category,
      city: event.city,
      location: event.location || "",
      startsAt: startsAtLocal,
      capacity: event.capacity ? String(event.capacity) : "",
      imageUrl: event.imageUrl || "",
    });
    setEditingEvent(event);
  };

  const getEventImage = (event: Event) => {
    return event.imageUrl || categoryImages[event.category] || categoryImages.other;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (editId && events && currentUser) {
      const eventToEdit = events.find((e: Event) => e.id === parseInt(editId));
      if (eventToEdit && eventToEdit.creator?.id === currentUser.id) {
        openEditDialog(eventToEdit);
        window.history.replaceState({}, "", "/");
      }
    }
  }, [events, currentUser]);

  const filteredEvents = events?.filter((e) => {
    if (showMyEvents) return isCreatorOrAdmin(e);
    if (selectedCategory && e.category !== selectedCategory) return false;
    if (citySearch.trim() && !e.city.toLowerCase().includes(citySearch.toLowerCase())) return false;
    return true;
  });

  const getCategoryIcon = (category: string) => {
    const cat = eventCategories.find((c) => c.id === category);
    return cat?.icon || "📌";
  };

  return (
    <>
      {showWelcomeTour && <WelcomeTour onComplete={handleTourComplete} />}
      <div className="min-h-screen bg-background pb-20">
      <div className="p-4 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">Activities</h1>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCitySearch(!showCitySearch)}
              className={showCitySearch || citySearch ? "border-amber-500 text-amber-600" : ""}
              data-testid="button-toggle-city-search"
            >
              <Search className="w-4 h-4" />
            </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600" data-testid="button-create-event">
                <Plus className="w-4 h-4 mr-2" />
                Crear
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md flex flex-col p-0 gap-0 max-h-[92vh]">
              <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between px-4 py-3 border-b">
                <DialogTitle className="text-base">Nueva Actividad</DialogTitle>
                <Button
                  onClick={() => createEventMutation.mutate(newEvent)}
                  disabled={!newEvent.title.trim() || !newEvent.city.trim() || !newEvent.startsAt || createEventMutation.isPending}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 rounded-full px-4 h-8 text-sm"
                  data-testid="button-submit-event"
                >
                  {createEventMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                </Button>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <EventForm
                  formData={newEvent}
                  setFormData={setNewEvent}
                  onSubmit={() => createEventMutation.mutate(newEvent)}
                  isPending={createEventMutation.isPending}
                  submitLabel="Guardar"
                  hideButton
                />
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {showCitySearch && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              placeholder="Search by city..."
              className="pl-9 pr-8"
              autoFocus
              data-testid="input-city-search"
            />
            {citySearch && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setCitySearch("")}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button
            variant={!showMyEvents && !showDeals && selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => { setShowMyEvents(false); setShowDeals(false); setSelectedCategory(null); }}
            className={!showMyEvents && !showDeals && selectedCategory === null ? "bg-amber-500 hover:bg-amber-600 shrink-0" : "shrink-0"}
            data-testid="button-filter-all"
          >
            All
          </Button>
          <Button
            variant={showMyEvents ? "default" : "outline"}
            size="sm"
            onClick={() => { setShowMyEvents(!showMyEvents); setShowDeals(false); setSelectedCategory(null); }}
            className={showMyEvents ? "bg-amber-900 hover:bg-amber-950 text-amber-100 shrink-0" : "shrink-0"}
            data-testid="button-filter-my-events"
          >
            🗓️ Mis eventos
          </Button>
          <Button
            variant={showDeals ? "default" : "outline"}
            size="sm"
            onClick={() => { setShowDeals(!showDeals); setShowMyEvents(false); setSelectedCategory(null); }}
            className={showDeals ? "bg-green-700 hover:bg-green-800 text-white shrink-0" : "shrink-0 border-green-600 text-green-700 hover:bg-green-50"}
            data-testid="button-filter-deals"
          >
            🏷️ Ofertas
          </Button>
          {!showMyEvents && !showDeals && eventCategories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className={selectedCategory === cat.id ? "bg-amber-500 hover:bg-amber-600 shrink-0" : "shrink-0"}
            >
              {cat.icon} {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stories row */}
      <div className="px-4 pt-3 pb-1">
        <StoriesRow />
      </div>

      {/* City inspirations carousel */}
      <CityAdsCarousel />

      {/* Business partnership banner */}
      <div className="mx-4 mt-4 mb-1">
        <a
          href="mailto:fallonyouapp@hotmail.com?subject=Colaboración%20empresarial%20FallonYou&body=Hola%2C%20me%20gustaría%20colaborar%20con%20FallonYou%20para%20ofrecer%20descuentos%20a%20vuestra%20comunidad."
          className="block rounded-2xl overflow-hidden relative group cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #0a0a0a 0%, #1a1200 50%, #0f0a00 100%)",
            border: "1px solid rgba(245,158,11,0.35)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(245,158,11,0.12)",
          }}
          data-testid="banner-business-partnership"
        >
          {/* Gold shimmer top line */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.6), transparent)" }} />

          <div className="p-4 flex items-center gap-4">
            {/* Icon block */}
            <div
              className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.15))", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              <Building2 className="w-6 h-6 text-amber-400" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold tracking-widest uppercase text-amber-500/80">Colaboración empresas</span>
              </div>
              <p className="text-sm font-bold text-white leading-snug">
                ¿Tienes una empresa?
              </p>
              <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                Enviamos clientes a tu negocio · Ellos ganan descuentos · Tú ganas visibilidad
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-[11px] font-semibold text-amber-400">Escríbenos y colaboramos</span>
                <ChevronRight className="w-3 h-3 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* Business icons row */}
          <div
            className="px-4 pb-3 flex items-center gap-3 overflow-x-auto scrollbar-hide"
            style={{ borderTop: "1px solid rgba(245,158,11,0.1)" }}
          >
            {["🍽️ Restaurantes", "🏋️ Gimnasios", "💆 Spas", "🎭 Ocio", "✈️ Viajes", "🛍️ Tiendas", "🎵 Música", "🏨 Hoteles"].map((item) => (
              <span key={item} className="text-[10px] text-white/35 whitespace-nowrap shrink-0">{item}</span>
            ))}
          </div>
        </a>
      </div>

      {currentUser && !currentUser.profileImageUrl && (
        <div
          className="mx-4 mb-2 rounded-xl bg-rose-500/10 border border-rose-400/30 p-3 flex items-start gap-3 cursor-pointer hover:bg-rose-500/15 transition-colors"
          onClick={() => navigate("/profile")}
          data-testid="banner-add-photo"
        >
          <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-base">📸</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-rose-700 dark:text-rose-400">Añade una foto de perfil</p>
            <p className="text-xs text-muted-foreground mt-0.5">Los perfiles con foto reciben 5× más interacciones. Toca para añadirla.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
        </div>
      )}

      {isSupported && !isSubscribed && showNotifBanner && !showWelcomeTour && (
        <div className="mx-4 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Activa las notificaciones</p>
            <p className="text-xs text-muted-foreground mt-0.5">Entérate de nuevas actividades, mensajes y matches al instante.</p>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 h-7 text-xs px-3"
                disabled={notifBannerLoading}
                data-testid="button-banner-enable-notifications"
                onClick={async () => {
                  setNotifBannerLoading(true);
                  const ok = await subscribe();
                  setNotifBannerLoading(false);
                  if (ok) {
                    setShowNotifBanner(false);
                    localStorage.setItem("fallonyou_notif_banner_dismissed", "1");
                  }
                }}
              >
                {notifBannerLoading ? "Activando..." : "Activar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-3 text-muted-foreground"
                data-testid="button-banner-dismiss-notifications"
                onClick={() => {
                  setShowNotifBanner(false);
                  localStorage.setItem("fallonyou_notif_banner_dismissed", "1");
                }}
              >
                Ahora no
              </Button>
            </div>
          </div>
        </div>
      )}

      {suggestionsData?.suggestions && suggestionsData.suggestions.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-sm">
              {suggestionsData.city
                ? `Actividades en ${suggestionsData.city}`
                : "Sugerencias para ti"}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {suggestionsData.suggestions.map((event) => (
              <div
                key={event.id}
                data-testid={`suggestion-card-${event.id}`}
                onClick={() => navigate(`/event/${event.id}`)}
                className="flex-shrink-0 w-48 cursor-pointer"
              >
                <div className="rounded-xl overflow-hidden shadow-sm border border-border hover:shadow-md transition-shadow">
                  <div className="relative h-28 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center">
                    <span className="text-3xl absolute opacity-20">{getCategoryIcon(event.category)}</span>
                    <img
                      src={getEventImage(event)}
                      alt={event.title}
                      className="w-full h-28 object-cover relative z-[1]"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                    <Badge className="absolute top-2 left-2 bg-black/70 text-white border-0 text-[10px] px-1.5 py-0.5 backdrop-blur-sm z-[2]">
                      {getCategoryIcon(event.category)}
                    </Badge>
                  </div>
                  <div className="p-2 bg-card">
                    <p className="text-xs font-semibold line-clamp-1 mb-0.5">{event.title}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />{event.city}
                    </p>
                    <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                      {format(new Date(event.startsAt), "d MMM · HH:mm")}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{event.participantCount} asistentes</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DEALS VIEW ─────────────────────────────────────── */}
      {showDeals && (
        <div className="p-4 space-y-4 pb-32">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-5 h-5 text-green-600" />
            <h2 className="font-bold text-lg">Ofertas exclusivas</h2>
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Solo miembros</Badge>
          </div>
          <p className="text-sm text-muted-foreground -mt-2 mb-3">Descuentos especiales de nuestros socios para ti</p>
          {offersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : !offers || offers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Store className="w-14 h-14 mx-auto mb-4 opacity-30" />
              <p className="font-medium">Próximamente</p>
              <p className="text-sm mt-1">Estamos cerrando acuerdos con los mejores locales.<br />¡Vuelve pronto!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-2xl border bg-card shadow-sm overflow-hidden"
                  data-testid={`card-offer-${offer.id}`}
                >
                  {/* Header with partner info */}
                  <div className="flex items-center gap-3 p-4 pb-3 border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {offer.partnerLogo ? (
                        <img src={offer.partnerLogo} alt={offer.partnerName} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight">{offer.partnerName}</p>
                      <p className="text-xs text-muted-foreground">{offer.partnerCity} · {offer.partnerCategory}</p>
                    </div>
                    {offer.discount && (
                      <div className="bg-green-600 text-white text-sm font-bold px-3 py-1 rounded-full flex-shrink-0">
                        {offer.discount}
                      </div>
                    )}
                  </div>
                  {/* Offer details */}
                  <div className="p-4">
                    <h3 className="font-bold text-base mb-1">{offer.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{offer.description}</p>
                    {offer.validUntil && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mb-3">
                        <Clock className="w-3 h-3" />
                        Válido hasta {new Date(offer.validUntil).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
                      </p>
                    )}
                    {offer.code && (
                      <div
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 border border-dashed border-green-400 rounded-xl px-4 py-3 cursor-pointer active:scale-95 transition-transform"
                        onClick={() => {
                          navigator.clipboard.writeText(offer.code!).catch(() => {});
                          setCopiedCode(offer.id);
                          setTimeout(() => setCopiedCode(null), 2000);
                        }}
                        data-testid={`button-copy-code-${offer.id}`}
                      >
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Código de descuento</p>
                          <p className="font-mono font-bold text-lg tracking-widest text-green-700 dark:text-green-400">{offer.code}</p>
                        </div>
                        <div className="text-green-600">
                          {copiedCode === offer.id ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <Check className="w-5 h-5" />
                              <span className="text-xs">¡Copiado!</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <Copy className="w-5 h-5" />
                              <span className="text-xs">Copiar</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* CTA for businesses */}
          <a
            href="mailto:fallonyouapp@hotmail.com?subject=Colaboración empresarial FallonYou"
            className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-900 to-amber-800 text-amber-100 mt-4"
          >
            <div>
              <p className="font-semibold text-sm">¿Tienes un negocio?</p>
              <p className="text-xs text-amber-300 mt-0.5">Colabora y llega a miles de usuarios</p>
            </div>
            <ChevronRight className="w-5 h-5 text-amber-400 flex-shrink-0" />
          </a>
        </div>
      )}

      {/* ── EVENTS VIEW ─────────────────────────────────────── */}
      {!showDeals && <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : filteredEvents?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            {showMyEvents ? (
              <>
                <p>Todavía no has creado ningún evento</p>
                <p className="text-sm mt-1">¡Crea el primero pulsando el botón +!</p>
              </>
            ) : (
              <>
                {(() => {
                  const userCity = (currentUser as any)?.profile?.currentCity || (currentUser as any)?.profile?.homeCity;
                  return userCity ? (
                    <>
                      <p className="font-medium">No hay planes en {userCity} aún</p>
                      <p className="text-sm mt-1">¡Sé el primero en crear uno!</p>
                      <Button
                        size="sm"
                        className="mt-4 bg-amber-500 hover:bg-amber-600"
                        onClick={() => setIsCreateOpen(true)}
                        data-testid="button-create-event-nudge"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Crear plan en {userCity}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p>No hay actividades aún</p>
                      <p className="text-sm mt-1">¡Crea la primera!</p>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        ) : (
          filteredEvents?.map((event) => (
            <Card
              key={event.id}
              className="overflow-hidden border-0 shadow-md cursor-pointer transition-shadow hover:shadow-lg"
              data-testid={`card-event-${event.id}`}
              onClick={() => navigate(`/event/${event.id}`)}
            >
              <div className="relative overflow-hidden">
                <div className={`w-full h-44 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 flex items-center justify-center ${isPastEvent(event.startsAt) ? "opacity-60 grayscale" : ""}`}>
                  <span className="text-5xl absolute z-0 opacity-30">{getCategoryIcon(event.category)}</span>
                  <img
                    src={getEventImage(event)}
                    alt={event.title}
                    className="w-full h-44 object-cover relative z-[1]"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = "none";
                    }}
                  />
                </div>
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge className="bg-black/70 text-white border-0 backdrop-blur-sm">
                    {getCategoryIcon(event.category)} {eventCategories.find(c => c.id === event.category)?.label}
                  </Badge>
                  {isPastEvent(event.startsAt) && (
                    <Badge variant="secondary" className="bg-black/70 text-white border-0 backdrop-blur-sm">
                      Ended
                    </Badge>
                  )}
                </div>
                {isCreatorOrAdmin(event) && (
                  <div className="absolute top-3 right-3 flex gap-2 z-10">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-9 w-9 p-0 rounded-full"
                      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.18)" }}
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmEventId(event.id); }}
                      disabled={deleteEventMutation.isPending}
                      data-testid={`button-delete-event-${event.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-bold text-lg leading-tight">{event.title}</h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{format(new Date(event.startsAt), "EEE, MMM d · h:mm a")}</span>
                  </div>
                  {!isPastEvent(event.startsAt) && <EventCountdown startsAt={event.startsAt} />}
                </div>
                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{event.location ? `${event.location}, ${event.city}` : event.city}</span>
                </div>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{event.description}</p>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-3">
                    {event.creator && (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={event.creator.profileImageUrl || undefined} />
                          <AvatarFallback className="text-xs">{event.creator.firstName?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">{event.creator.firstName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {event.participantAvatars?.length > 0 ? (
                        <div className="flex items-center">
                          <div className="flex -space-x-2">
                            {event.participantAvatars.slice(0, 3).map((p) => (
                              <Avatar key={p.id} className="w-6 h-6 border-2 border-background">
                                <AvatarImage src={p.profileImageUrl || undefined} />
                                <AvatarFallback className="text-[10px]">{p.firstName?.[0]}</AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <span className="text-sm font-medium ml-1.5">
                            {event.participantCount}{event.capacity && `/${event.capacity}`}
                          </span>
                        </div>
                      ) : (
                        <>
                          <Users className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium">
                            {event.participantCount}
                            {event.capacity && ` / ${event.capacity}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {!isPastEvent(event.startsAt) && isCreatorOrAdmin(event) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); openEditDialog(event); }}
                      className="border-amber-500 text-amber-600 hover:bg-amber-50"
                      data-testid={`button-edit-event-${event.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                  )}
                  {!isPastEvent(event.startsAt) && (event.isParticipant || isCreatorOrAdmin(event)) && (
                    <Badge className="bg-green-600/90 text-white border-0" data-testid={`badge-attending-${event.id}`}>
                      ✓ Attending
                    </Badge>
                  )}
                  {!isPastEvent(event.startsAt) && !isCreatorOrAdmin(event) && !event.isParticipant && (
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); joinEventMutation.mutate(event.id); }}
                      disabled={joinEventMutation.isPending}
                      className="bg-amber-500 hover:bg-amber-600"
                      data-testid={`button-join-event-${event.id}`}
                    >
                      I'm interested
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {filteredEvents && filteredEvents.length > 0 && (
          <InviteFriends />
        )}
      </div>}

      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="max-w-md flex flex-col p-0 gap-0 max-h-[92vh]">
          <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between px-4 py-3 border-b">
            <DialogTitle className="text-base">Editar Actividad</DialogTitle>
            <Button
              onClick={() => editingEvent && editEventMutation.mutate({ id: editingEvent.id, data: editForm })}
              disabled={!editForm.title.trim() || !editForm.city.trim() || !editForm.startsAt || editEventMutation.isPending}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 rounded-full px-4 h-8 text-sm"
              data-testid="button-submit-edit-event"
            >
              {editEventMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <EventForm
              formData={editForm}
              setFormData={setEditForm}
              onSubmit={() => editingEvent && editEventMutation.mutate({ id: editingEvent.id, data: editForm })}
              isPending={editEventMutation.isPending}
              submitLabel="Guardar"
              hideButton
            />
          </div>
        </DialogContent>
      </Dialog>

      <SocialProofTicker />
      <BottomNav />

      {/* Delete event confirmation dialog */}
      <AlertDialog open={deleteConfirmEventId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmEventId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar este evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente. Se eliminará el evento y todos sus participantes perderán el acceso. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-event">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-delete-event"
              onClick={() => {
                if (deleteConfirmEventId !== null) {
                  deleteEventMutation.mutate(deleteConfirmEventId);
                  setDeleteConfirmEventId(null);
                }
              }}
            >
              {deleteEventMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sí, borrar evento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
}
