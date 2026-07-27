"use client";

import { Button, Skeleton } from "@outegro/ui";
import { PlayIcon } from "lucide-react";
import { useState } from "react";
import { useReelMedia } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

/**
 * The reel itself, next to its extracted data.
 *
 * Playback resolves a fresh signed URL from Instagram's CDN on demand rather than serving a
 * stored copy. Those URLs expire within hours, so anything we saved would rot; and the video is
 * watched once — while deciding which Kakao candidate is the right one — which is not worth
 * ~5MB per reel of storage plus the egress to serve it back.
 *
 * Nothing here is load-bearing: if Instagram refuses, the reviewer still has the caption, the
 * note and the candidate list.
 */
export function ReelPreview({ reelId }: { reelId: string }) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(false);
  // Resolving costs a yt-dlp call, so it waits until someone actually wants to watch.
  const media = useReelMedia(playing ? reelId : null);

  if (!playing) {
    return (
      <Button variant="outline" size="sm" className="self-start" onClick={() => setPlaying(true)}>
        <PlayIcon />
        {t("queue.watch")}
      </Button>
    );
  }

  if (media.isLoading) return <Skeleton className="aspect-[9/16] w-full max-w-56 rounded-lg" />;

  if (!media.data?.videoUrl) {
    return <p className="text-muted-foreground text-xs">{t("queue.noVideo")}</p>;
  }

  return (
    // biome-ignore lint/a11y/useMediaCaption: a user-submitted Instagram reel has no caption track
    <video
      src={media.data.videoUrl}
      poster={media.data.thumbnail ?? undefined}
      controls
      autoPlay
      playsInline
      className="w-full max-w-56 rounded-lg border"
    />
  );
}
