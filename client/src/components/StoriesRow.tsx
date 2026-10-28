import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, X, Loader2, Camera, Images, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-danceme";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useContentUploadConsent } from "@/components/ContentUploadConsent";
import { useI18n, useTranslation } from "@/lib/i18n";
import { createPortal } from "react-dom";
import { StoryMedia } from "./StoryMedia";
import { Button } from "@/components/ui/button";
import type { StoryAudience } from "@shared/story-audience";
import {
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StoryGroup {
  userId: string;
  userName: string;
  userPhoto: string | null;
  stories: {
    id: number;
    mediaUrl: string;
    caption: string | null;
    expiresAt: string;
    audience?: StoryAudience;
  }[];
}

const audienceCopy = {
  en: {
    label: "Who can see this story?",
    connections: "Connections",
    connectionsDescription: "Accepted mutual connections",
    everyone: "Everyone",
    everyoneDescription: "All signed-in users",
    publishHint: "Choosing a camera or library photo publishes it right away with this audience.",
  },
  es: {
    label: "¿Quién puede ver esta historia?",
    connections: "Conexiones",
    connectionsDescription: "Conexiones mutuas aceptadas",
    everyone: "Todos",
    everyoneDescription: "Todos los usuarios con sesión iniciada",
    publishHint: "Al elegir una foto de la cámara o la galería, se publicará de inmediato con esta audiencia.",
  },
  fr: {
    label: "Qui peut voir cette story ?",
    connections: "Relations",
    connectionsDescription: "Relations mutuelles acceptées",
    everyone: "Tout le monde",
    everyoneDescription: "Tous les utilisateurs connectés",
    publishHint: "Choisir une photo de l’appareil photo ou de la galerie la publie immédiatement auprès de cette audience.",
  },
  sv: {
    label: "Vem kan se den här storyn?",
    connections: "Kontakter",
    connectionsDescription: "Accepterade ömsesidiga kontakter",
    everyone: "Alla",
    everyoneDescription: "Alla inloggade användare",
    publishHint: "När du väljer ett foto från kameran eller biblioteket publiceras det direkt med den här målgruppen.",
  },
} as const;

function getStoryAudience(audience?: StoryAudience): StoryAudience {
  return audience === "everyone" ? "everyone" : "connections";
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
  const t = useTranslation();
  const name = group.userName || t.ui.storyUnknownName;
  return (
    <button
      onClick={onClick}
      className="group flex min-h-[76px] min-w-[68px] flex-col items-center gap-1.5 shrink-0 rounded-xl px-1 py-1 outline-none transition-transform active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      data-testid={`story-avatar-${group.userId}`}
      aria-label={`${isOwn ? t.ui.storyOwn : name}`}
    >
      <div
        className="h-[62px] w-[62px] rounded-full p-[2px] shadow-sm transition-transform group-hover:scale-[1.03]"
        style={{
          background: isOwn
            ? "linear-gradient(145deg,#d4a846,#f4e7c5)"
            : "linear-gradient(145deg,#d4a846,#f5d88f,#e9c36d)",
        }}
      >
        <div className="h-full w-full overflow-hidden rounded-full border-[2px] border-background bg-card">
          {group.userPhoto ? (
            <img src={group.userPhoto} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-lg font-semibold text-foreground/75">
              {group.userName?.[0] ?? "?"}
            </div>
          )}
        </div>
      </div>
      <span className="w-[68px] truncate text-center text-xs leading-tight text-foreground/70">
        {isOwn ? t.ui.storyOwn : name}
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDeleteStoryId, setSelectedDeleteStoryId] = useState<number | null>(null);
  const deleteInFlight = useRef(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const t = useTranslation();
  const { language } = useI18n();
  const audienceLabels = audienceCopy[language];
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/stories/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error(t.ui.storyDeleteError);
    },
  });

  const group = groups[groupIdx];
  if (!group) { onClose(); return null; }
  const story = group.stories[storyIdx];
  if (!story) { onClose(); return null; }

  function next() {
    if (deleteMutation.isPending) return;
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
    if (deleteMutation.isPending) return;
    if (storyIdx > 0) {
      setStoryIdx(i => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx(i => i - 1);
      setStoryIdx(0);
    }
  }

  function requestDelete() {
    if (deleteMutation.isPending) return;
    setSelectedDeleteStoryId(story.id);
    setDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    const storyId = selectedDeleteStoryId;
    if (storyId === null || deleteInFlight.current) return;
    deleteInFlight.current = true;
    try {
      await deleteMutation.mutateAsync(storyId);
      void queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      setDeleteDialogOpen(false);
      toast({ title: t.ui.storyDeleted });
      onClose();
    } catch {
      toast({ title: t.common.error, description: t.ui.storyDeleteError, variant: "destructive" });
    } finally {
      deleteInFlight.current = false;
    }
  }

  function closeViewer() {
    if (!deleteMutation.isPending) onClose();
  }

  const isOwn = currentUser?.id === group.userId;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-[#141412] text-white"
    >
      {/* Progress bars */}
      <div className="flex gap-1.5 px-4 pb-2 pt-[max(env(safe-area-inset-top),12px)]">
        {group.stories.map((_, i) => (
          <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-[#f0cc77]"
              style={{ width: i < storyIdx ? "100%" : i === storyIdx ? "60%" : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="px-4 pb-3">
        <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-2 py-1.5">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/25 bg-white/10">
            {group.userPhoto
              ? <img src={group.userPhoto} alt="" className="w-full h-full object-cover" />
              : <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">{group.userName?.[0] ?? "?"}</div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-white">{group.userName || t.ui.storyUnknownName}</p>
            <p className="text-xs text-white/60" data-testid="story-expiry">{t.ui.storyExpires}</p>
            {isOwn && (
              <p className="mt-0.5 text-[11px] text-white/55" data-testid="story-audience-label">
                {audienceLabels[getStoryAudience(story.audience)]}
              </p>
            )}
          </div>
          {isOwn && (
            <button
              ref={deleteButtonRef}
              onClick={requestDelete}
              disabled={deleteMutation.isPending}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:opacity-50"
              data-testid="button-delete-story"
              aria-label={t.ui.storyDelete}
              title={t.ui.storyDelete}
            >
              <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          )}
          <button onClick={closeViewer} disabled={deleteMutation.isPending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:opacity-50"
            data-testid="button-close-story" aria-label={t.common.close}>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Media */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#0c0c0b]">
        <StoryMedia key={`${story.id}:${story.mediaUrl}`} url={story.mediaUrl}
          labels={{ loading: t.ui.storyMediaLoading, error: t.ui.storyMediaError,
            retry: t.ui.storyMediaRetry, sound: t.ui.storyMediaSound }} />
        <button
          onClick={prev}
          disabled={deleteMutation.isPending || (groupIdx === 0 && storyIdx === 0)}
          className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:opacity-30"
          aria-label={t.ui.storyPrevious}
          data-testid="story-previous-media"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          onClick={next}
          disabled={deleteMutation.isPending}
          className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:opacity-40"
          aria-label={t.ui.storyNext}
          data-testid="story-next-media"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        {story.caption && (
          <div className="pointer-events-none absolute inset-x-0 bottom-16 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-5 pb-6 pt-14">
            <p className="mx-auto max-w-lg text-center text-sm leading-relaxed text-white">{story.caption}</p>
          </div>
        )}
      </div>
      {/* Separate navigation must never intercept native video controls. */}
      <div className="flex shrink-0 justify-between gap-4 border-t border-white/10 bg-[#141412] px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
        <button onClick={prev} disabled={deleteMutation.isPending || (groupIdx === 0 && storyIdx === 0)}
          className="min-h-11 min-w-11 rounded-full px-4 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:opacity-30" aria-label={t.ui.storyPrevious} data-testid="story-previous">
          {t.ui.storyPrevious}
        </button>
        <button onClick={next} disabled={deleteMutation.isPending} className="min-h-11 min-w-11 rounded-full px-4 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:opacity-40" aria-label={t.ui.storyNext} data-testid="story-next">
          {t.ui.storyNext}
        </button>
      </div>
      <AlertDialogPrimitive.Root
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleteMutation.isPending) setDeleteDialogOpen(open);
        }}
      >
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[110] bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <AlertDialogPrimitive.Content
            onEscapeKeyDown={(event) => {
              if (deleteMutation.isPending) event.preventDefault();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              deleteButtonRef.current?.focus();
            }}
            className="fixed left-1/2 top-1/2 z-[111] grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl sm:p-6"
          >
            <AlertDialogHeader className="text-left">
              <AlertDialogTitle>{t.ui.storyDeleteConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{t.ui.storyDeleteConfirmDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
              <AlertDialogPrimitive.Cancel asChild>
              <Button
                type="button"
                variant="outline"
                className="mt-0 min-h-11 sm:mt-0"
                disabled={deleteMutation.isPending}
                onClick={() => setDeleteDialogOpen(false)}
                data-testid="button-cancel-delete-story"
              >
                {t.common.cancel}
              </Button>
              </AlertDialogPrimitive.Cancel>
              <Button
                type="button"
                variant="destructive"
                className="min-h-11"
                disabled={deleteMutation.isPending}
                onClick={confirmDelete}
                data-testid="button-confirm-delete-story"
              >
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {deleteMutation.isPending ? t.ui.storyDeleting : t.ui.storyDelete}
              </Button>
            </AlertDialogFooter>
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    </motion.div>
    , document.body
  );
}

export function StoriesRow() {
  const t = useTranslation();
  const { language } = useI18n();
  const audienceLabels = audienceCopy[language];
  const { data: currentUser } = useCurrentUser();
  const { toast } = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const requestConsent = useContentUploadConsent();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [audience, setAudience] = useState<StoryAudience>("connections");
  const [viewerState, setViewerState] = useState({ open: false, groupIdx: 0, instance: 0 });

  const { data: storyGroups = [], isLoading } = useQuery<StoryGroup[]>({
    queryKey: ["/api/stories"],
    refetchInterval: 60000,
  });

  const myGroup = storyGroups.find(g => g.userId === currentUser?.id);
  const othersGroups = storyGroups.filter(g => g.userId !== currentUser?.id);
  const allGroups = myGroup ? [myGroup, ...othersGroups] : othersGroups;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSheetOpen(false);
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type.toLowerCase())) {
      toast({ title: t.common.error, description: t.ui.storyPhotoOnly, variant: "destructive" });
      e.target.value = "";
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: t.common.error, description: t.ui.storyFileTooLarge, variant: "destructive" });
      e.target.value = "";
      return;
    }
    if (!(await requestConsent())) {
      e.target.value = "";
      return;
    }
    setUploading(true);
    let errorDescription = t.ui.storyUploadError;
    try {
      const formData = new FormData();
      formData.append("media", file);
      formData.append("caption", "");
      formData.append("audience", audience);
      const res = await fetch("/api/stories", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 413) errorDescription = t.ui.storyFileTooLarge;
        throw new Error(errorDescription);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      toast({ title: t.ui.storyPublished, description: t.ui.storyVisibleDuration });
    } catch {
      toast({ title: t.common.error, description: errorDescription, variant: "destructive" });
    } finally {
      setUploading(false);
      [cameraRef, libraryRef].forEach(r => { if (r.current) r.current.value = ""; });
    }
  }

  // Always show the row if user is logged in
  if (!currentUser) return null;

  return (
    <>
      <div className="flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide" data-testid="stories-row">

        {/* Add story button */}
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <button
            onClick={() => {
              setAudience("connections");
              setSheetOpen(true);
            }}
            disabled={uploading}
            className="group flex h-[62px] w-[62px] items-center justify-center rounded-full border border-dashed border-amber-600/55 bg-amber-500/[0.07] text-amber-700 shadow-sm transition-all hover:border-amber-700/70 hover:bg-amber-500/[0.13] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
            data-testid="button-add-story"
            aria-label={t.ui.storiesAddStatus}
          >
            {uploading
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
            }
          </button>
          <span className="w-[68px] text-center text-xs leading-tight text-muted-foreground">
            {uploading ? t.ui.storiesUploading : t.ui.storiesAddStatus}
          </span>

          {/* Hidden file inputs */}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
          <input ref={libraryRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>

        {/* Loading skeletons */}
        {isLoading && [1, 2, 3].map(i => (
          <div key={i} className="flex flex-col items-center gap-1 shrink-0 animate-pulse">
            <div className="h-[62px] w-[62px] rounded-full bg-muted" />
            <div className="h-3 w-12 rounded bg-muted" />
          </div>
        ))}

        {/* Story groups */}
        {!isLoading && allGroups.map((group, idx) => (
          <StoryAvatar
            key={group.userId}
            group={group}
            isOwn={group.userId === currentUser?.id}
            onClick={() => setViewerState(state => ({ open: true, groupIdx: idx, instance: state.instance + 1 }))}
          />
        ))}
      </div>

      <AnimatePresence>
        {viewerState.open && allGroups.length > 0 && (
          <StoryViewer
            key={viewerState.instance}
            groups={allGroups}
            startGroupIdx={Math.min(viewerState.groupIdx, allGroups.length - 1)}
            onClose={() => setViewerState(state => ({ ...state, open: false }))}
          />
        )}
      </AnimatePresence>

      {/* Bottom sheet — source picker */}
      {createPortal(<AnimatePresence>
        {sheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/50"
              onClick={() => setSheetOpen(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[90] rounded-t-[28px] border border-border/70 bg-card pb-[max(env(safe-area-inset-bottom),8px)] shadow-[0_-18px_60px_rgba(25,24,20,0.22)]"
            >
              {/* Handle */}
              <div className="flex justify-center pb-1 pt-3">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>

              <p className="px-4 pb-5 pt-3 text-center text-sm font-semibold tracking-tight text-foreground" data-testid="story-picker-title">
                {t.ui.storyAddTitle}
              </p>

              <fieldset className="mx-5 mb-4 rounded-2xl border border-border/70 bg-muted/25 px-4 py-3">
                <legend className="px-1 text-sm font-semibold text-foreground">
                  {audienceLabels.label}
                </legend>
                <div className="grid gap-2">
                  <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/60">
                    <input
                      type="radio"
                      name="story-audience"
                      value="connections"
                      checked={audience === "connections"}
                      onChange={() => setAudience("connections")}
                      className="mt-1 h-4 w-4 accent-amber-600"
                      data-testid="story-audience-connections"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{audienceLabels.connections}</span>
                      <span className="block text-xs leading-relaxed text-muted-foreground">{audienceLabels.connectionsDescription}</span>
                    </span>
                  </label>
                  <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/60">
                    <input
                      type="radio"
                      name="story-audience"
                      value="everyone"
                      checked={audience === "everyone"}
                      onChange={() => setAudience("everyone")}
                      className="mt-1 h-4 w-4 accent-amber-600"
                      data-testid="story-audience-everyone"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{audienceLabels.everyone}</span>
                      <span className="block text-xs leading-relaxed text-muted-foreground">{audienceLabels.everyoneDescription}</span>
                    </span>
                  </label>
                </div>
                <p className="mt-2 px-2 text-xs leading-relaxed text-muted-foreground" data-testid="story-audience-publish-hint">
                  {audienceLabels.publishHint}
                </p>
              </fieldset>

              <div className="grid grid-cols-2 gap-3 px-5 pb-5">
                {/* Cámara */}
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="flex min-h-28 flex-col items-center justify-center gap-2.5 rounded-2xl border border-amber-700/10 bg-amber-500/[0.08] p-4 transition-colors hover:bg-amber-500/[0.14] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                  data-testid="button-story-camera"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/[0.14]">
                    <Camera className="h-5 w-5 text-amber-700" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{t.ui.storyCamera}</span>
                </button>

                {/* Galería / Fotocasa */}
                <button
                  onClick={() => libraryRef.current?.click()}
                  className="flex min-h-28 flex-col items-center justify-center gap-2.5 rounded-2xl border border-border/70 bg-muted/50 p-4 transition-colors hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                  data-testid="button-story-library"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground/[0.06]">
                    <Images className="h-5 w-5 text-foreground/75" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{t.ui.storyGallery}</span>
                </button>

              </div>

              <button
                onClick={() => setSheetOpen(false)}
                className="min-h-12 w-full border-t border-border/70 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-600"
                data-testid="story-picker-cancel"
              >
                {t.common.cancel}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>, document.body)}
    </>
  );
}
