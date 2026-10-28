import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, RotateCw, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ProfileDetailSheet } from "@/components/ProfileDetailSheet";
import { ConnectionError, useSwipeRight, type UserWithPhotos } from "@/hooks/use-danceme";
import { connectionCopy } from "@/lib/connection-copy";
import { useI18n } from "@/lib/i18n";
import { publicProfileCopy } from "@/components/public-profile-copy";

type ConnectionStatus = "none" | "pending" | "connected";
type PublicProfileResponse = UserWithPhotos & { connectionStatus: ConnectionStatus };

class PublicProfileLoadError extends Error {
  constructor(readonly status: number) {
    super("Unable to load public profile");
  }
}

export function PublicProfileViewer({ userId, open, onOpenChange }: {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { language } = useI18n();
  const copy = publicProfileCopy[language];
  const connectionText = connectionCopy[language];
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendBlocked, setSendBlocked] = useState(false);
  const requestLock = useRef(false);
  const profileUrl = userId ? `/api/users/${encodeURIComponent(userId)}/public-profile` : "";
  const queryKey = [profileUrl] as const;

  useEffect(() => {
    setSendError(null);
    setSendBlocked(false);
    requestLock.current = false;
  }, [userId]);

  const profileQuery = useQuery<PublicProfileResponse>({
    queryKey,
    enabled: open && !!userId,
    queryFn: async () => {
      const response = await fetch(profileUrl, { credentials: "include" });
      if (!response.ok) throw new PublicProfileLoadError(response.status);
      return response.json() as Promise<PublicProfileResponse>;
    },
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const { mutate: swipeRight, isPending: isSending } = useSwipeRight();

  const response = !profileQuery.isError && profileQuery.data?.id === userId ? profileQuery.data : undefined;
  const profileUser = response as UserWithPhotos | undefined;
  const connectionStatus = response?.connectionStatus;
  const loadUnavailable = profileQuery.error instanceof PublicProfileLoadError &&
    (profileQuery.error.status === 403 || profileQuery.error.status === 404);

  const sendRequest = () => {
    if (!userId || requestLock.current || isSending || connectionStatus !== "none" || sendBlocked) return;
    requestLock.current = true;
    setSendError(null);
    swipeRight(userId, {
      onSuccess: (result) => {
        const nextStatus: ConnectionStatus = result.isMatch ? "connected" : "pending";
        queryClient.setQueryData<PublicProfileResponse>(queryKey, (current) =>
          current?.id === userId ? { ...current, connectionStatus: nextStatus } : current
        );
        requestLock.current = false;
      },
      onError: (error) => {
        requestLock.current = false;
        const status = error instanceof ConnectionError ? error.status : undefined;
        if (status === 429) {
          setSendError(connectionText.dailyLimit);
          setSendBlocked(true);
        } else if (status === 403 || status === 404 || status === 409) {
          setSendError(connectionText.unavailable);
          setSendBlocked(true);
        } else {
          setSendError(connectionText.sendErrorDescription || copy.sendFailed);
        }
      },
    });
  };

  const action = connectionStatus === "connected" ? (
    <div className="flex flex-col gap-2">
      <Button data-testid="button-member-open-connections" className="w-full bg-amber-500 text-black hover:bg-amber-400" onClick={() => navigate("/matches")}>
        <UserRound className="mr-2 h-4 w-4" />{copy.connected} · {copy.openMatches}
      </Button>
    </div>
  ) : connectionStatus === "pending" ? (
    <div className="space-y-2" role="status">
      <Button disabled className="w-full border border-amber-500/40 bg-amber-500/10 text-amber-700 opacity-100 dark:text-amber-300">
        {copy.pending}
      </Button>
      <p className="text-sm text-muted-foreground">{connectionText.mutualExplanation}</p>
    </div>
  ) : (
    <div className="space-y-2">
      {sendError && <p role="alert" className="text-sm text-destructive">{sendError}</p>}
      <Button
        className="w-full bg-amber-500 text-black hover:bg-amber-400"
        onClick={sendRequest}
        disabled={isSending || sendBlocked}
        aria-busy={isSending}
        data-testid="button-member-connect"
      >
        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isSending ? copy.sending : sendError && !sendBlocked ? copy.retry : copy.connect}
      </Button>
    </div>
  );

  if (profileUser && open) {
    return (
      <ProfileDetailSheet
        key={userId}
        user={profileUser}
        open={open}
        onOpenChange={onOpenChange}
        connectionAction={action}
      />
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="max-h-[88dvh] overflow-y-auto rounded-t-3xl px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5"
        data-testid="public-profile-state"
      >
        <SheetHeader>
          <SheetTitle>{loadUnavailable ? connectionText.unavailable : connectionText.traveler}</SheetTitle>
        </SheetHeader>
        {profileQuery.isLoading || (!profileQuery.isError && !response) ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
            <div className="h-28 w-24 animate-pulse rounded-2xl bg-amber-500/15" />
            <p className="text-sm text-muted-foreground">{copy.loading}</p>
          </div>
        ) : profileQuery.isError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {loadUnavailable ? connectionText.unavailable : copy.loadFailed}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => profileQuery.refetch()}>
              <RotateCw className="mr-2 h-4 w-4" />{copy.retry}
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}