import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api, buildUrl } from "@shared/routes";
import { type UpsertUser, type User, type Photo, type Match, type Rating } from "@shared/schema";
import { z } from "zod";

// --- Auth / User ---

export function useCurrentUser() {
  return useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      // Returns null if not logged in, or User object
      return api.auth.me.responses[200].parse(data);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: {
      id?: string | number; displayName?: string; bio?: string; age?: number; showAge?: boolean; gender?: string; preference?: string;
      personalPreferencesConsent?: boolean; personalPreferencesConsentVersion?: string;
      religion?: null; politics?: null; relationshipType?: null;
    }) => {
      const res = await fetch(api.users.updateProfile.path, {
        method: api.users.updateProfile.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onMutate: async (newData) => {
      // Cancel outgoing queries for optimistic update
      await queryClient.cancelQueries({ queryKey: [api.auth.me.path] });
      
      // Get current data
      const previousData = queryClient.getQueryData([api.auth.me.path]);
      
      // Optimistically update the cache immediately
      queryClient.setQueryData([api.auth.me.path], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          firstName: newData.displayName || old.firstName,
          displayName: newData.displayName || old.displayName,
          profile: {
            ...old.profile,
            bio: newData.bio ?? old.profile?.bio,
            age: newData.age ?? old.profile?.age,
            showAge: newData.showAge ?? old.profile?.showAge,
            gender: newData.gender ?? old.profile?.gender,
            preference: newData.preference ?? old.profile?.preference,
          }
        };
      });
      
      return { previousData };
    },
    onError: (_err, _newData, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData([api.auth.me.path], context.previousData);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });
}

// --- Photos ---

// Note: For uploads we use the special ObjectStorage hook/component separately,
// but we might need to delete photos here.
export function useDeletePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: number) => {
      const url = buildUrl(api.photos.delete.path, { id: photoId });
      const res = await fetch(url, {
        method: api.photos.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete photo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });
}

// --- Swiping / Users ---

export type UserWithPhotos = User & { 
  photos: Photo[];
  profile: {
    bio?: string | null;
    age?: number | null;
    showAge?: boolean;
    gender?: string | null;
    preference?: string | null;
    zodiacSign?: string | null;
    smoking?: string | null;
    drinking?: string | null;
    children?: string | null;
    education?: string | null;
    occupation?: string | null;
    birthplace?: string | null;
    height?: number | null;
    religion?: string | null;
    politics?: string | null;
    pets?: string | null;
    exercise?: string | null;
    interests?: string[] | null;
    relationshipType?: string | null;
    lastActive?: Date | null;
    nextAdventure?: string | null;
    favoriteDestinations?: string[] | null;
    notRecommendedDestinations?: string[] | null;
    langLevel?: string | null;
    primaryLang?: string | null;
  } | null;
};

export function useSwipeFeed() {
  const query = useInfiniteQuery({
    queryKey: [api.users.list.path],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: "24" });
      if (pageParam) params.set("cursor", pageParam);
      const res = await fetch(`${api.users.list.path}?${params}`, { credentials: "include", signal });
      if (!res.ok) throw new Error("Failed to fetch swipe feed");
      return { items: api.users.list.responses[200].parse(await res.json()), nextCursor: res.headers.get("X-Next-Cursor") || undefined };
    },
    getNextPageParam: page => page.nextCursor,
    refetchOnWindowFocus: false,
  });
  const data = useMemo(() => query.data ? [...query.data.pages].reverse().flatMap(page => page.items) : undefined, [query.data]);
  return { ...query, data };
}

export class ConnectionError extends Error {
  constructor(public readonly status: number) {
    super("Failed to connect");
  }
}

export function useSwipeRight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await fetch(api.matches.create.path, {
        method: api.matches.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
        credentials: "include",
      });
      if (!res.ok) throw new ConnectionError(res.status);
      // Only isMatch=true confirms a mutual connection; pending requests also
      // return a non-null envelope.
      return api.matches.create.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.matches.requests.path] });
      queryClient.invalidateQueries({ queryKey: [api.matches.incoming.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-connected-cities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/premium/liked-by"] });
      queryClient.invalidateQueries({ queryKey: ["/api/premium/status"] });
    },
  });
}

// --- Matches & Ratings ---

export type MatchWithUser = Match & { otherUser: User };

export function useMatches() {
  return useQuery({
    queryKey: [api.matches.list.path],
    queryFn: async () => {
      const res = await fetch(api.matches.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch matches");
      return api.matches.list.responses[200].parse(await res.json());
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });
}

export function useSentConnectionRequests(direction: "sent" | "incoming" = "sent") {
  const endpoint = direction === "incoming" ? api.matches.incoming : api.matches.requests;
  return useQuery({
    queryKey: [endpoint.path],
    queryFn: async () => {
      const res = await fetch(endpoint.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sent connection requests");
      return endpoint.responses[200].parse(await res.json());
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });
}

export function useRateMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { matchId: number; score: number }) => {
      const res = await fetch(api.ratings.create.path, {
        method: api.ratings.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to submit rating");
      return api.ratings.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
    },
  });
}
