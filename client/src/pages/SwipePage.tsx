import { useSwipeFeed, useSwipeRight, useCurrentUser } from "@/hooks/use-danceme";
import { SwipeCard } from "@/components/SwipeCard";
import { BottomNav } from "@/components/BottomNav";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles, SlidersHorizontal, Star, X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SwipePage() {
  const { data: currentUser, isLoading: isAuthLoading } = useCurrentUser();
  const { data: users, isLoading: isUsersLoading, refetch } = useSwipeFeed();
  const { mutate: swipeRight } = useSwipeRight();
  const { toast } = useToast();
  
  const [activeUsers, setActiveUsers] = useState<typeof users>([]);
  const [matchAnimation, setMatchAnimation] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [localPrefs, setLocalPrefs] = useState({
    minAge: 18,
    maxAge: 50,
    maxDistance: 50,
    showMe: 'everyone'
  });

  const { data: preferences } = useQuery({
    queryKey: ['/api/preferences'],
  });

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        minAge: preferences.minAge ?? 18,
        maxAge: preferences.maxAge ?? 50,
        maxDistance: preferences.maxDistance ?? 50,
        showMe: preferences.showMe ?? 'everyone'
      });
    }
  }, [preferences]);

  const { data: superLikeStatus, refetch: refetchSuperLike } = useQuery({
    queryKey: ['/api/super-likes/status'],
  });

  const updatePreferences = useMutation({
    mutationFn: async (prefs: any) => {
      const res = await apiRequest('PATCH', '/api/preferences', prefs);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/preferences'] });
      refetch();
    }
  });

  const superLikeMutation = useMutation({
    mutationFn: async ({ toUserId, userId }: { toUserId: string; userId: number }) => {
      const res = await apiRequest('POST', '/api/super-likes', { toUserId });
      return { ...(await res.json()), userId };
    },
    onSuccess: (data) => {
      refetchSuperLike();
      setActiveUsers((prev) => prev?.filter((u) => u.id !== data.userId));
      if (data.isMatch) {
        setMatchAnimation(true);
        setTimeout(() => setMatchAnimation(false), 2000);
      }
      toast({
        title: "Super Like sent!",
        description: "They'll see you liked them with a star",
      });
    },
    onError: () => {
      toast({
        title: "No super likes left",
        description: "Get Premium for more super likes!",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (users) {
      setActiveUsers(users);
    }
  }, [users]);

  // Auth check
  if (!isAuthLoading && !currentUser) {
    window.location.href = "/auth";
    return null;
  }

  const handleSwipe = (userId: number, direction: "left" | "right") => {
    // Remove user from active stack
    setActiveUsers((prev) => prev?.filter((u) => u.id !== userId));

    if (direction === "right") {
      swipeRight(userId, {
        onSuccess: (data) => {
          if (data) {
            // It's a match!
            setMatchAnimation(true);
            setTimeout(() => setMatchAnimation(false), 2000);
          }
        },
      });
    }
  };

  if (isAuthLoading || isUsersLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden pb-20">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <h1 className="text-3xl font-display font-black"><span className="text-pink-500">Fall</span><span className="text-orange-400">on</span><span className="text-fuchsia-500">You</span></h1>
        <div className="flex items-center gap-2">
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-filters">
                <SlidersHorizontal className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Discovery Preferences</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-3">
                  <Label>Age Range: {localPrefs.minAge} - {localPrefs.maxAge}</Label>
                  <Slider
                    value={[localPrefs.minAge, localPrefs.maxAge]}
                    min={18}
                    max={70}
                    step={1}
                    onValueChange={([min, max]) => {
                      setLocalPrefs(prev => ({ ...prev, minAge: min, maxAge: max }));
                    }}
                    onValueCommit={([min, max]) => {
                      updatePreferences.mutate({ minAge: min, maxAge: max });
                    }}
                    data-testid="slider-age-range"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Maximum Distance: {localPrefs.maxDistance} km</Label>
                  <Slider
                    value={[localPrefs.maxDistance]}
                    min={5}
                    max={200}
                    step={5}
                    onValueChange={([dist]) => {
                      setLocalPrefs(prev => ({ ...prev, maxDistance: dist }));
                    }}
                    onValueCommit={([dist]) => {
                      updatePreferences.mutate({ maxDistance: dist });
                    }}
                    data-testid="slider-distance"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Show Me</Label>
                  <Select
                    value={localPrefs.showMe}
                    onValueChange={(value) => {
                      setLocalPrefs(prev => ({ ...prev, showMe: value }));
                      updatePreferences.mutate({ showMe: value });
                    }}
                  >
                    <SelectTrigger data-testid="select-show-me">
                      <SelectValue placeholder="Select preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="men">Men</SelectItem>
                      <SelectItem value="women">Women</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 p-[2px]">
             <img 
               src={currentUser?.photos?.[0]?.url || currentUser?.profileImageUrl || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&auto=format&fit=crop&q=60"} 
               className="w-full h-full rounded-full object-cover border-2 border-white"
               alt="Profile"
             />
          </div>
        </div>
      </div>

      {/* Card Stack */}
      <div className="relative w-full max-w-md mx-auto h-[65vh] px-4 mt-2">
        <AnimatePresence>
          {activeUsers && activeUsers.length > 0 ? (
            activeUsers.map((user, index) => {
              if (index > activeUsers.length - 3) {
                 return (
                   <div key={user.id} className="absolute inset-x-4 inset-y-0" style={{ zIndex: index }}>
                     <SwipeCard user={user} onSwipe={(dir) => handleSwipe(user.id, dir)} />
                   </div>
                 );
              }
              return null;
            })
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-card rounded-3xl border border-dashed">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold">No more profiles</h3>
                <p className="text-muted-foreground mt-2 mb-6">Come back later for more recommendations.</p>
                <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh">
                  Refresh
                </Button>
             </div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      {activeUsers && activeUsers.length > 0 && (
        <div className="flex justify-center gap-6 mt-4">
          <Button
            variant="outline"
            size="icon"
            className="w-14 h-14 rounded-full border-2 border-red-200 text-red-500 hover:bg-red-50"
            onClick={() => {
              const topUser = activeUsers[activeUsers.length - 1];
              if (topUser) handleSwipe(topUser.id, 'left');
            }}
            data-testid="button-pass"
          >
            <X className="w-7 h-7" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-14 h-14 rounded-full border-2 border-blue-200 text-blue-500 hover:bg-blue-50"
            onClick={() => {
              const topUser = activeUsers[activeUsers.length - 1];
              if (topUser) {
                superLikeMutation.mutate({ toUserId: topUser.id.toString(), userId: topUser.id });
              }
            }}
            disabled={!(superLikeStatus as any)?.canSuperLike || superLikeMutation.isPending}
            data-testid="button-super-like"
          >
            <Star className="w-7 h-7" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-14 h-14 rounded-full border-2 border-green-200 text-green-500 hover:bg-green-50"
            onClick={() => {
              const topUser = activeUsers[activeUsers.length - 1];
              if (topUser) handleSwipe(topUser.id, 'right');
            }}
            data-testid="button-like"
          >
            <Heart className="w-7 h-7" />
          </Button>
        </div>
      )}

      {/* Super Like Counter */}
      {(superLikeStatus as any)?.remaining !== undefined && (
        <p className="text-center text-sm text-muted-foreground mt-2">
          {(superLikeStatus as any).remaining} Super Likes remaining today
        </p>
      )}

      {/* Match Overlay Animation */}
      <AnimatePresence>
        {matchAnimation && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="text-center">
              <h2 className="text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary drop-shadow-2xl animate-pulse">
                IT'S A MATCH!
              </h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
