import { useMatches, useCurrentUser } from "@/hooks/use-danceme";
import { BottomNav } from "@/components/BottomNav";
import { MatchRatingModal } from "@/components/MatchRatingModal";
import { useState } from "react";
import { Loader2, MessageCircle, Star } from "lucide-react";

export default function MatchesPage() {
  const { data: currentUser } = useCurrentUser();
  const { data: matches, isLoading } = useMatches();
  const [selectedMatch, setSelectedMatch] = useState<{ id: number, user: any } | null>(null);

  if (!currentUser) return null;

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6">
      <h1 className="text-3xl font-display font-bold mb-6 px-2">Matches</h1>
      
      <div className="space-y-4">
        {matches?.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <MessageCircle className="w-16 h-16 mx-auto mb-4" />
            <p className="text-lg font-medium">No matches yet</p>
            <p className="text-sm">Start swiping to find people!</p>
          </div>
        ) : (
          matches?.map((match) => (
            <div 
              key={match.id}
              onClick={() => setSelectedMatch({ id: match.id, user: match.otherUser })}
              className="group relative bg-card p-4 rounded-2xl border shadow-sm hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-4"
            >
              {/* Avatar */}
              <div className="relative">
                <img 
                  src={match.otherUser.photos?.[0]?.url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60"} 
                  alt={match.otherUser.displayName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                />
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold font-display truncate">
                  {match.otherUser.displayName}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                   Tap to chat and rate...
                </p>
              </div>

              {/* Action */}
              <button className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Star className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>

      {selectedMatch && (
        <MatchRatingModal 
          isOpen={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          matchId={selectedMatch.id}
          user={selectedMatch.user}
        />
      )}

      <BottomNav />
    </div>
  );
}
