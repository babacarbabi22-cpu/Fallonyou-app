import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getStoryMediaKind, type StoryMediaKind } from "../lib/story-media";

export interface StoryMediaLabels {
  loading: string;
  error: string;
  retry: string;
  sound: string;
}

export function StoryMedia({ url, labels }: { url: string; labels: StoryMediaLabels }) {
  const [kind, setKind] = useState<StoryMediaKind | undefined>(() => getStoryMediaKind(url));
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [muted, setMuted] = useState(true);
  const [tryVideo, setTryVideo] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    setMuted(true);
    setTryVideo(false);
    const known = getStoryMediaKind(url);
    setKind(known);
    if (!known) {
      void fetch(url, { method: "HEAD", credentials: "include", cache: "no-store", signal: controller.signal })
        .then(response => {
          if (controller.signal.aborted) return;
          if (!response.ok) { setError(true); return; }
          const detected = getStoryMediaKind(url, response.headers.get("Content-Type"));
          setTryVideo(!detected);
          setKind(detected ?? "image");
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          // Legacy/external URLs may not support HEAD. Try decoding, not a silent blank screen.
          setTryVideo(true);
          setKind("image");
        });
    }
    return () => controller.abort();
  }, [url, retry]);

  if (error) return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-white text-center" role="alert" data-testid="story-media-error">
      <p>{labels.error}</p>
      <button className="rounded-lg border border-white/50 px-4 py-2" onClick={() => setRetry(i => i + 1)}>
        {labels.retry}
      </button>
    </div>
  );
  if (!kind) return (
    <div className="absolute inset-0 flex items-center justify-center gap-2 text-white" role="status">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{labels.loading}</span>
    </div>
  );
  if (kind === "video") return (
    <div className="absolute inset-0">
      <video
        key={`${url}:${retry}`}
        src={url}
        className="w-full h-full object-contain"
        controls
        playsInline
        autoPlay
        muted={muted}
        preload="metadata"
        onError={() => setError(true)}
        data-testid="story-video-player"
      />
      {muted && (
        <button className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-2 text-sm text-white"
          onClick={() => setMuted(false)} data-testid="story-enable-sound">
          {labels.sound}
        </button>
      )}
    </div>
  );
  return (
    <img key={`${url}:${retry}`} src={url} alt="" className="absolute inset-0 w-full h-full object-contain"
      onError={() => {
        if (tryVideo) { setTryVideo(false); setKind("video"); }
        else setError(true);
      }} data-testid="story-photo" />
  );
}