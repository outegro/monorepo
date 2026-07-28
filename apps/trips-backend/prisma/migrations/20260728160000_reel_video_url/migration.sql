-- Capture the direct CDN video URL at ingest, from the same yt-dlp call that reads the
-- caption, so the review list can show the reel inline instead of resolving one per card on
-- click. The URLs are signed and expire in hours; the player re-resolves on demand when
-- playback fails, so a stale value degrades rather than breaks.


-- AlterTable
ALTER TABLE "reels" ADD COLUMN     "video_url" TEXT;

