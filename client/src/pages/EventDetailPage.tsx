import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, MapPin, Calendar, Users, Clock, Send, Loader2, Trash2, MessageCircle } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useCurrentUser } from "@/hooks/use-danceme";
import { format, formatDistanceToNow } from "date-fns";

const categoryImages: Record<string, string> = {
  dining: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop",
  nightlife: "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&h=400&fit=crop",
  outdoor: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=400&fit=crop",
  culture: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=400&fit=crop",
  sports: "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=800&h=400&fit=crop",
  travel: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=400&fit=crop",
  music: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop",
  other: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop",
};

interface EventDetail {
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
  participants: Array<{
    id: string;
    firstName: string | null;
    profileImageUrl: string | null;
    status: string;
  }>;
  creator: {
    id: string;
    firstName: string | null;
    profileImageUrl: string | null;
  } | null;
}

interface Comment {
  id: number;
  eventId: number;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    profileImageUrl: string | null;
  } | null;
}

export default function EventDetailPage() {
  const [, params] = useRoute("/event/:id");
  const [, navigate] = useLocation();
  const { data: currentUser } = useCurrentUser();
  const [commentText, setCommentText] = useState("");
  const eventId = params?.id ? parseInt(params.id) : 0;

  const { data: event, isLoading, isError, error } = useQuery<EventDetail>({
    queryKey: ["/api/events", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}`, { credentials: "include" });
      if (res.status === 401) throw new Error("Please log in to view this event");
      if (res.status === 404) throw new Error("Event not found");
      if (!res.ok) throw new Error("Failed to load event");
      return res.json();
    },
    enabled: !!eventId,
    retry: (failureCount, error) => {
      if (error.message === "Event not found" || error.message === "Please log in to view this event") return false;
      return failureCount < 2;
    },
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery<Comment[]>({
    queryKey: ["/api/events", eventId, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/comments`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!eventId && !!event,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${eventId}/join`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/comments`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "comments"] });
      setCommentText("");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/events/${eventId}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "comments"] });
    },
  });

  const isPast = event ? new Date(event.startsAt) < new Date() : false;
  const isJoined = event?.participants?.some(p => p.id === currentUser?.id);
  const isCreator = event?.creator?.id === currentUser?.id;
  const eventImage = event?.imageUrl || categoryImages[event?.category || "other"] || categoryImages.other;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground text-center">{error?.message || "Event not found"}</p>
        <Button onClick={() => navigate("/")} variant="outline" data-testid="button-go-back">Go back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="relative">
        <img src={eventImage} alt={event.title} className={`w-full h-56 object-cover ${isPast ? "opacity-60 grayscale" : ""}`} />
        <Button
          size="sm"
          variant="secondary"
          className="absolute top-4 left-4 h-9 w-9 p-0 rounded-full bg-white/90 hover:bg-white"
          onClick={() => navigate("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        {isPast && (
          <Badge className="absolute top-4 right-4 bg-black/70 text-white border-0">Ended</Badge>
        )}
      </div>

      <div className="p-4">
        <h1 className="text-2xl font-bold" data-testid="text-event-title">{event.title}</h1>

        <div className="flex flex-col gap-2 mt-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span>{format(new Date(event.startsAt), "EEEE, MMMM d, yyyy · h:mm a")}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-500" />
            <span>{event.location ? `${event.location}, ${event.city}` : event.city}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            <span>
              {event.participants.length} attending
              {event.capacity && ` · ${event.capacity - event.participants.length} spots left`}
            </span>
          </div>
        </div>

        {event.creator && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-muted/50 rounded-xl">
            <Avatar className="w-10 h-10">
              <AvatarImage src={event.creator.profileImageUrl || undefined} />
              <AvatarFallback>{event.creator.firstName?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">Hosted by {event.creator.firstName}</p>
              <p className="text-xs text-muted-foreground">Organizer</p>
            </div>
          </div>
        )}

        {event.description && (
          <div className="mt-4">
            <h3 className="font-semibold mb-1">About</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {!isPast && !isJoined && !isCreator && (
          <Button
            className="w-full mt-4 bg-amber-500 hover:bg-amber-600"
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
            data-testid="button-join-event"
          >
            {joinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Join this activity
          </Button>
        )}

        {isJoined && !isCreator && (
          <Badge className="mt-4 bg-green-100 text-green-800 border-green-200">You're attending</Badge>
        )}

        {event.participants.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Attendees ({event.participants.length})</h3>
            <div className="flex flex-wrap gap-3">
              {event.participants.map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-1">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={p.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xs">{p.firstName?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">{p.firstName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Comments ({comments.length})
          </h3>

          <div className="flex gap-2 mb-4">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && commentText.trim()) {
                  addCommentMutation.mutate(commentText);
                }
              }}
              data-testid="input-comment"
            />
            <Button
              size="sm"
              onClick={() => commentText.trim() && addCommentMutation.mutate(commentText)}
              disabled={!commentText.trim() || addCommentMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 px-3"
              data-testid="button-send-comment"
            >
              {addCommentMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {commentsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 p-3 bg-muted/30 rounded-xl" data-testid={`comment-${comment.id}`}>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={comment.user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xs">{comment.user?.firstName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{comment.user?.firstName}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                        {comment.user?.id === currentUser?.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                            data-testid={`button-delete-comment-${comment.id}`}
                          >
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm mt-0.5">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
