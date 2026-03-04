import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar, MapPin, Users, Plus, Clock, Loader2, Trash2, Pencil, ImagePlus, X, Search, MessageCircle, Image } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { WelcomeTour } from "@/components/WelcomeTour";
import { InviteFriends } from "@/components/InviteFriends";
import { useCurrentUser } from "@/hooks/use-danceme";
import { useUpload } from "@/hooks/use-upload";
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
  participantCount: number;
  isParticipant: boolean;
  creator: {
    id: string;
    firstName: string | null;
    profileImageUrl: string | null;
  } | null;
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

function EventForm({
  formData,
  setFormData,
  onSubmit,
  isPending,
  submitLabel,
}: {
  formData: EventFormData;
  setFormData: (data: EventFormData) => void;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(formData.imageUrl || null);
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
            <Button
              size="sm"
              variant="destructive"
              className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
              onClick={removeImage}
              type="button"
            >
              <X className="w-4 h-4" />
            </Button>
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full mt-2 h-28 border-dashed flex flex-col gap-2"
            onClick={() => fileInputRef.current?.click()}
            type="button"
            disabled={isUploading}
            data-testid="button-add-event-image"
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <ImagePlus className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Add a cover photo</span>
              </>
            )}
          </Button>
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
        <Input
          type="datetime-local"
          value={formData.startsAt}
          onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
          data-testid="input-event-date"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Max participants (optional)</label>
        <Input
          type="number"
          value={formData.capacity}
          onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
          placeholder="No limit"
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
      <Button
        onClick={onSubmit}
        disabled={!formData.title.trim() || !formData.city.trim() || !formData.startsAt || isPending || isUploading}
        className="w-full bg-amber-500 hover:bg-amber-600"
        data-testid="button-submit-event"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
      </Button>
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
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

  const createEventMutation = useMutation({
    mutationFn: async (eventData: EventFormData) => {
      const res = await apiRequest("POST", "/api/events", {
        ...eventData,
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

  const isCreator = (event: Event) => {
    return currentUser && event.creator && event.creator.id === currentUser.id;
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
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Activity</DialogTitle>
              </DialogHeader>
              <EventForm
                formData={newEvent}
                setFormData={setNewEvent}
                onSubmit={() => createEventMutation.mutate(newEvent)}
                isPending={createEventMutation.isPending}
                submitLabel="Create Activity"
              />
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

        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null ? "bg-amber-500 hover:bg-amber-600" : ""}
          >
            All
          </Button>
          {eventCategories.map((cat) => (
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

      <InviteFriends />

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : filteredEvents?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No activities yet</p>
            <p className="text-sm">Be the first to create one!</p>
          </div>
        ) : (
          filteredEvents?.map((event) => (
            <Card
              key={event.id}
              className="overflow-hidden border-0 shadow-md cursor-pointer transition-shadow hover:shadow-lg"
              data-testid={`card-event-${event.id}`}
              onClick={() => navigate(`/event/${event.id}`)}
            >
              <div className="relative">
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
                {isCreator(event) && (
                  <div className="absolute top-3 right-3 flex gap-2">
                    {!isPastEvent(event.startsAt) && (
                      <button
                        className="text-white drop-shadow-md hover:text-amber-300 transition-colors"
                        onClick={(e) => { e.stopPropagation(); openEditDialog(event); }}
                        data-testid={`button-edit-event-${event.id}`}
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                    )}
                    {isPastEvent(event.startsAt) && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0 rounded-full"
                        onClick={(e) => { e.stopPropagation(); deleteEventMutation.mutate(event.id); }}
                        disabled={deleteEventMutation.isPending}
                        data-testid={`button-delete-event-${event.id}`}
                      >
                        {deleteEventMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-bold text-lg leading-tight">{event.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{format(new Date(event.startsAt), "EEE, MMM d · h:mm a")}</span>
                  </div>
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
                      <Users className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium">
                        {event.participantCount}
                        {event.capacity && ` / ${event.capacity}`}
                      </span>
                    </div>
                  </div>
                  {!isPastEvent(event.startsAt) && (event.isParticipant || isCreator(event)) && (
                    <Badge className="bg-green-600/90 text-white border-0" data-testid={`badge-attending-${event.id}`}>
                      ✓ Attending
                    </Badge>
                  )}
                  {!isPastEvent(event.startsAt) && !isCreator(event) && !event.isParticipant && (
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
      </div>

      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          <EventForm
            formData={editForm}
            setFormData={setEditForm}
            onSubmit={() => editingEvent && editEventMutation.mutate({ id: editingEvent.id, data: editForm })}
            isPending={editEventMutation.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
    </>
  );
}
