import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar, MapPin, Users, Plus, Clock, Loader2, Trash2, Pencil } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { WelcomeTour } from "@/components/WelcomeTour";
import { useCurrentUser } from "@/hooks/use-danceme";
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
  participantCount: number;
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
  return (
    <div className="space-y-4">
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
        disabled={!formData.title.trim() || !formData.city.trim() || !formData.startsAt || isPending}
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
};

export default function EventsPage() {
  const { data: currentUser } = useCurrentUser();
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
    });
    setEditingEvent(event);
  };

  const filteredEvents = selectedCategory
    ? events?.filter((e) => e.category === selectedCategory)
    : events;

  const getCategoryIcon = (category: string) => {
    const cat = eventCategories.find((c) => c.id === category);
    return cat?.icon || "📌";
  };

  return (
    <>
      {showWelcomeTour && <WelcomeTour onComplete={handleTourComplete} />}
      <div className="min-h-screen bg-background pb-20">
      <div className="p-4 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Activities</h1>
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
            <Card key={event.id} className="overflow-hidden" data-testid={`card-event-${event.id}`}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="text-4xl">{getCategoryIcon(event.category)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{event.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{event.city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Clock className="w-4 h-4" />
                      <span>{format(new Date(event.startsAt), "MMM d, h:mm a")}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium">
                          {event.participantCount}
                          {event.capacity && ` / ${event.capacity}`}
                        </span>
                      </div>
                      {event.creator && (
                        <div className="flex items-center gap-1">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={event.creator.profileImageUrl || undefined} />
                            <AvatarFallback className="text-xs">{event.creator.firstName?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{event.creator.firstName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {isCreator(event) && !isPastEvent(event.startsAt) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(event)}
                        data-testid={`button-edit-event-${event.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    ) : !isPastEvent(event.startsAt) ? (
                      <Button
                        size="sm"
                        onClick={() => joinEventMutation.mutate(event.id)}
                        disabled={joinEventMutation.isPending}
                        className="bg-amber-500 hover:bg-amber-600"
                        data-testid={`button-join-event-${event.id}`}
                      >
                        Join
                      </Button>
                    ) : null}
                    {isPastEvent(event.startsAt) && isCreator(event) && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteEventMutation.mutate(event.id)}
                        disabled={deleteEventMutation.isPending}
                        data-testid={`button-delete-event-${event.id}`}
                      >
                        {deleteEventMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    {isPastEvent(event.startsAt) && (
                      <Badge variant="secondary" className="text-xs opacity-70">
                        Ended
                      </Badge>
                    )}
                  </div>
                </div>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{event.description}</p>
                )}
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
