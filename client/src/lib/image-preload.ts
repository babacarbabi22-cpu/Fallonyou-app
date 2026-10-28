type PhotoPreview = {
  photos?: { url: string }[] | null;
  profileImageUrl?: string | null;
};

// Discovery displays the end of the array first. Prioritize that photo,
// then only the next three, not the entire directory or alternate avatars.
export function discoveryPreloadUrls(users: readonly PhotoPreview[]): string[] {
  return [...new Set(
    users.slice(-4)
      .reverse()
      .map(user => user.photos?.[0]?.url || user.profileImageUrl)
      .filter((url): url is string => Boolean(url)),
  )];
}

// Per-page and bounded: no persistent media cache, blobs, URL rewriting,
// or relaxation of private-image access/cache headers.
export function createDiscoveryPreloader(createImage: () => HTMLImageElement = () => new Image()) {
  const images = new Map<string, HTMLImageElement>();
  return {
    warm(urls: readonly string[]) {
      const wanted = [...new Set(urls)].slice(0, 4);
      for (const [url, image] of images) {
        if (!wanted.includes(url)) {
          image.onload = null;
          image.onerror = null;
          images.delete(url);
        }
      }
      wanted.forEach((url, index) => {
        const existing = images.get(url);
        if (existing) {
          existing.fetchPriority = index === 0 ? "high" : "low";
          return;
        }
        const image = createImage();
        image.fetchPriority = index === 0 ? "high" : "low";
        images.set(url, image);
        image.onerror = () => {
          if (images.get(url) === image) images.delete(url);
        };
        image.src = url;
      });
    },
    clear() {
      for (const image of images.values()) {
        image.onload = null;
        image.onerror = null;
      }
      images.clear();
    },
  };
}