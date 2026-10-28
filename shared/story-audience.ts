import { z } from "zod";

export const storyAudienceSchema = z.enum(["connections", "everyone"]);
export type StoryAudience = z.infer<typeof storyAudienceSchema>;
export const DEFAULT_STORY_AUDIENCE: StoryAudience = "connections";

// Missing/legacy values remain private; never interpret an unknown value as public.
export function canViewStory(
  story: { userId: string; audience?: string | null },
  viewerId: string,
  acceptedConnections: ReadonlySet<string>,
  blockedUsers: ReadonlySet<string> = new Set(),
): boolean {
  if (story.userId === viewerId) return true;
  if (blockedUsers.has(story.userId)) return false;
  return story.audience === "everyone" || acceptedConnections.has(story.userId);
}