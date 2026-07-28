"use client";

import { useState } from "react";
import { useReelMedia } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Reel } from "@/lib/types";

/**
 * The reel, playing inline in the list.
 *
 * The URL is captured at ingest from the same yt-dlp call that reads the caption, so a card
 * renders a real player without a per-card round trip. Instagram signs those URLs and expires
 * them within hours: `preload="none"` keeps a list of a hundred from fetching a hundred videos,
 * and when a stale URL fails the component resolves a fresh one once, on demand.
 */
export function ReelPlayer({ reel, className }: { reel: Reel; className?: string }) {
  const { t } = useI18n();
  const [expired, setExpired] = useState(false);
  const refreshed = useReelMedia(expired ? reel.id : null);

  const src = expired ? refreshed.data?.videoUrl : reel.videoUrl;
  const poster = (expired ? refreshed.data?.thumbnail : reel.thumbnail) ?? undefined;

  if (!src) {
    return (
      <div
        className={`flex aspect-[9/16] items-center justify-center rounded-lg border border-dashed text-center text-muted-foreground text-xs ${className ?? ""}`}
      >
        {refreshed.isLoading ? "…" : t("queue.noVideo")}
      </div>
    );
  }

  return (
    // biome-ignore lint/a11y/useMediaCaption: a user-submitted Instagram reel has no caption track
    <video
      key={src}
      src={src}
      poster={poster}
      controls
      playsInline
      preload="none"
      // A signed URL that has aged out errors on load; re-resolve once rather than showing a
      // dead player. Guarded so a genuinely missing video cannot loop.
      onError={() => !expired && setExpired(true)}
      className={`aspect-[9/16] w-full rounded-lg border bg-black object-cover ${className ?? ""}`}
    />
  );
}
