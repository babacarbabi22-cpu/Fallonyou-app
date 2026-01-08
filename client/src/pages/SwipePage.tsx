import { useSwipeFeed, useSwipeRight, useCurrentUser } from "@/hooks/use-danceme";
import { SwipeCard } from "@/components/SwipeCard";
import { BottomNav } from "@/components/BottomNav";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";

export default function SwipePage() {
  const { data: currentUser, isLoading: isAuthLoading } = useCurrentUser();
  const { data: users, isLoading: isUsersLoading, refetch } = useSwipeFeed();
  const { mutate: swipeRight } = useSwipeRight();
  
  // Local state to manage the stack of cards visually
  // We'll filter out users as they are swiped
  const [activeUsers, setActiveUsers] = useState<typeof users>([]);
  const [matchAnimation, setMatchAnimation] = useState(false);

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
        <h1 className="text-3xl font-display font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          danceme
        </h1>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 p-[2px]">
           <img 
             src={currentUser?.photos?.[0]?.url || "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&auto=format&fit=crop&q=60"} 
             className="w-full h-full rounded-full object-cover border-2 border-white"
             alt="Profile"
           />
        </div>
      </div>

      {/* Card Stack */}
      <div className="relative w-full max-w-md mx-auto h-[75vh] px-4 mt-2">
        <AnimatePresence>
          {activeUsers && activeUsers.length > 0 ? (
            activeUsers.map((user, index) => {
              // Only render the top 2 cards for performance
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
             <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/50 rounded-3xl border border-dashed border-gray-300">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-700">No more profiles</h3>
                <p className="text-gray-500 mt-2 mb-6">Come back later for more recommendations.</p>
                <button 
                  onClick={() => refetch()}
                  className="px-6 py-2 rounded-full bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all font-medium text-sm text-gray-600"
                >
                  Refresh
                </button>
             </div>
          )}
        </AnimatePresence>
      </div>

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
