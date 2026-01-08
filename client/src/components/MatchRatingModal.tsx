import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { useRateMatch } from "@/hooks/use-danceme";
import { User } from "@shared/schema";
import { motion } from "framer-motion";

interface MatchRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: number;
  user: User;
}

export function MatchRatingModal({ isOpen, onClose, matchId, user }: MatchRatingModalProps) {
  const [score, setScore] = useState<number>(5);
  const { mutate: rateMatch, isPending } = useRateMatch();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    rateMatch({ matchId, score }, {
      onSuccess: () => {
        setSubmitted(true);
        setTimeout(() => {
          onClose();
          setSubmitted(false);
        }, 1500);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-0 bg-transparent shadow-none p-0 overflow-hidden">
        <div className="bg-white/95 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/50">
          {!submitted ? (
            <>
              <DialogHeader className="text-center">
                <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-secondary mb-4 p-1">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-3xl font-bold text-primary">
                     {score}
                  </div>
                </div>
                <DialogTitle className="text-2xl font-display text-primary">What are the odds?</DialogTitle>
                <DialogDescription className="text-base text-muted-foreground">
                  Rate the probability of meeting {user.displayName} in person from 1 to 10.
                </DialogDescription>
              </DialogHeader>

              <div className="py-8 px-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2 font-medium">
                  <span>Not likely</span>
                  <span>Maybe</span>
                  <span>Definitely</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isPending ? "Submitting..." : "Submit Rating"}
                </button>
              </div>
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-foreground">Rating Saved!</h3>
              <p className="text-muted-foreground mt-1">Thanks for your feedback.</p>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
