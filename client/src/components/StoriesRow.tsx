import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-danceme";
import { motion, AnimatePresence } from "framer-motion";

interface StoryGroup {
  userId: string;
  userName: string;
  userPhoto: string | null;
  stories: { id: number; mediaUrl: string; caption: string | null; expiresAt: string }[];
}

function StoryAvatar({
  group,
  isOwn,
  onClick,
}: {
  group: StoryGroup;
  isOwn?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 shrink-0"
      data-testid={`story-avatar-${group.userId}`}
    >
      <div
        className="w-16 h-16 rounded-full p-[2px]"
        style={{
          background: isOwn
            ? "rgba(245,158,11,0.3)"
            : "linear-gradient(135deg,#F59E0B,#EF4444,#8B5CF6)",
        }}
      >
        <div className="w-full h-full rounded-full overflow-hidden border-2 border-background">
          {group.userPhoto ? (
            <img src={group.userPhoto} alt={group.userName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-lg font-bold">
              {group.userName[0]}
            </div>
          )}
        </div>
      </div>
      <span className="text-xs text-center text-foreground/70 w-16 truncate leading-tight">
        {isOwn ? "Tu story" : group.userName}
      </span>
    </button>
  );
}

// Full-screen story viewer
function StoryViewer({
  groups,
  startGroupIdx,
  onClose,
}: {
  groups: StoryGroup[];
  startGroupIdx: number;
  onClose: () => void;
}) {
  const [groupIdx, setGroupIdx] = useState(startGroupIdx);
  const [storyIdx, setStoryIdx] = useState(0);
  const { data: currentUser } = useCurrentUser();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/stories/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      onClose();
    },
  });

  const group = groups[groupIdx];
  if (!group) { onClose(); return null; }
  const story = group.stories[storyIdx];
  if (!story) { onClose(); return null; }

  function next() {
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(i => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(i => i + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }

  function prev() {
    if (storyIdx > 0) {
      setStoryIdx(i => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx(i => i - 1);
      setStoryIdx(0);
    }
  }

  const isOwn = currentUser?.id === group.userId;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Progress bars */}
      <div className="flex gap-1 p-3 pt-safe">
        {group.stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: i < storyIdx ? "100%" : i === storyIdx ? "50%" : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pb-3">
        <div className="w-9 h-9 rounded-full overflow-hidden border border-white/30">
          {group.userPhoto
            ? <img src={group.userPhoto} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-white/20 flex items-center justify-center text-white font-bold">{group.userName[0]}</div>
          }
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{group.userName}</p>
          <p className="text-white/60 text-xs">{new Date(story.expiresAt).getHours() > 0 ? "Caduca hoy" : ""}</p>
        </div>
        {isOwn && (
          <button
            onClick={() => deleteMutation.mutate(story.id)}
            className="text-white/60 hover:text-red-400 transition-colors mr-2"
            data-testid="button-delete-story"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <button onClick={onClose} className="text-white/80 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Media */}
      <div className="flex-1 relative">
        <img src={story.mediaUrl} alt="" className="w-full h-full object-contain" />
        {story.caption && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70">
            <p className="text-white text-sm text-center">{story.caption}</p>
          </div>
        )}
        {/* Tap zones */}
        <button className="absolute left-0 top-0 bottom-0 w-1/3" onClick={prev} aria-label="Anterior" />
        <button className="absolute right-0 top-0 bottom-0 w-1/3" onClick={next} aria-label="Siguiente" />
      </div>
    </motion.div>
  );
}

export function StoriesRow() {
  const { data: currentUser } = useCurrentUser();
  const [viewerState, setViewerState] = useState<{ open: boolean; groupIdx: number }>({ open: false, groupIdx: 0 });

  const { data: storyGroups = [], isLoading } = useQuery<StoryGroup[]>({
    queryKey: ["/api/stories"],
    refetchInterval: 60000,
  });

  if (isLoading) return null;

  // Check if current user has a story
  const myGroup = storyGroups.find(g => g.userId === currentUser?.id);
  const othersGroups = storyGroups.filter(g => g.userId !== currentUser?.id);
  const allGroups = myGroup ? [myGroup, ...othersGroups] : othersGroups;

  if (allGroups.length === 0 && !currentUser) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide" data-testid="stories-row">
        {/* Add story button — always visible */}
        {currentUser && !myGroup && (
          <label
            className="flex flex-col items-center gap-1 shrink-0 cursor-pointer"
            data-testid="button-add-story"
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-400/50 flex items-center justify-center bg-amber-500/5">
              <Plus className="w-6 h-6 text-amber-500" />
            </div>
            <span className="text-xs text-muted-foreground w-16 truncate text-center">Añadir</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                // Convert to base64 for quick upload (limited to photos already uploaded via object storage)
                // For now, prompt user to use their profile photo
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const dataUrl = ev.target?.result as string;
                  await apiRequest("POST", "/api/stories", { mediaUrl: dataUrl, caption: "" });
                  queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
        )}

        {/* Story groups */}
        {allGroups.map((group, idx) => (
          <StoryAvatar
            key={group.userId}
            group={group}
            isOwn={group.userId === currentUser?.id}
            onClick={() => setViewerState({ open: true, groupIdx: idx })}
          />
        ))}
      </div>

      <AnimatePresence>
        {viewerState.open && (
          <StoryViewer
            groups={allGroups}
            startGroupIdx={viewerState.groupIdx}
            onClose={() => setViewerState({ open: false, groupIdx: 0 })}
          />
        )}
      </AnimatePresence>
    </>
  );
}
