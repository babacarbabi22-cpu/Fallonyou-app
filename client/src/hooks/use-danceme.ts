import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertUser, type User, type Photo, type Match, type Rating } from "@shared/schema";
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
    mutationFn: async (updates: { id?: string | number; displayName?: string; bio?: string; age?: number; gender?: string; preference?: string }) => {
      const res = await fetch(api.users.updateProfile.path, {
        method: api.users.updateProfile.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: () => {
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
    incognito?: boolean | null;
  } | null;
};

export function useSwipeFeed() {
  return useQuery({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await fetch(api.users.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch swipe feed");
      return api.users.list.responses[200].parse(await res.json());
    },
  });
}

export function useSwipeRight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: number) => {
      const res = await fetch(api.matches.create.path, {
        method: api.matches.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to swipe right");
      // Returns a Match object if matched, or null if just pending
      return api.matches.create.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      // Invalidate matches list in case we got a match
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
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
