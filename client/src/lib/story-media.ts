export type StoryMediaKind = "image" | "video";

export function getStoryMediaKind(url: string, contentType?: string | null): StoryMediaKind | undefined {
  const mime = contentType?.split(";")[0].trim().toLowerCase();
  if (mime?.startsWith("video/")) return "video";
  if (mime?.startsWith("image/")) return "image";
  try {
    const pathname = new URL(url, "https://story.invalid").pathname.toLowerCase();
    if (/\.(mp4|m4v|mov|webm|ogv|ogg|avi)$/.test(pathname)) return "video";
    if (/\.(jpg|jpeg|png|gif|webp|avif|heic|bmp)$/.test(pathname)) return "image";
  } catch { /* Unknown URLs are resolved by the authenticated media response. */ }
  return undefined;
}