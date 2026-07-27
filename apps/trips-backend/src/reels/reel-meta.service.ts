import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Injectable, Logger } from "@nestjs/common";

const exec = promisify(execFile);

export interface ReelMeta {
  caption: string | null;
  uploader: string | null;
  thumbnail: string | null;
  durationSec: number | null;
}

/**
 * Reads an Instagram reel's caption via yt-dlp.
 *
 * Why yt-dlp and not Instagram's own API: there is no public API for someone else's reel, and
 * the surfaces people usually reach for are dead — og:meta, /embed/captioned/ and oEmbed all
 * return a login wall (checked 2026-07-27), and the popular "anonymous GraphQL" trick relies
 * on hardcoded doc_id/lsd tokens that Instagram rotates. yt-dlp is the one option that is
 * actively maintained against those changes, and it reads public reels with no cookies.
 *
 * Metadata only — `--skip-download`. The catalogue resolves places from the caption; the video
 * itself costs bandwidth and storage and adds nothing to that. Downloading it is a separate
 * feature if we ever want offline viewing on the trip.
 *
 * Best-effort by contract: every failure returns nulls instead of throwing. A reel whose
 * caption cannot be read still belongs in the review queue with whatever note the human typed,
 * so this must never be able to fail an ingest.
 */
@Injectable()
export class ReelMetaService {
  private readonly logger = new Logger(ReelMetaService.name);

  async fetch(url: string): Promise<ReelMeta> {
    try {
      const { stdout } = await exec(
        "yt-dlp",
        [
          "--skip-download",
          "--dump-single-json",
          "--no-warnings",
          "--no-playlist",
          // Instagram throttles bursts; 100+ reels are processed sequentially anyway, but a
          // hung socket must not hold a worker slot.
          "--socket-timeout",
          "20",
          "--retries",
          "2",
          url,
        ],
        { timeout: 45_000, maxBuffer: 8 * 1024 * 1024 },
      );
      const j = JSON.parse(stdout) as {
        description?: string;
        uploader?: string;
        thumbnail?: string;
        duration?: number;
      };
      return {
        caption: j.description?.trim() || null,
        uploader: j.uploader?.trim() || null,
        thumbnail: j.thumbnail || null,
        durationSec: typeof j.duration === "number" ? Math.round(j.duration) : null,
      };
    } catch (error) {
      // Private account, deleted post, rate limit, yt-dlp missing in a dev shell — all the
      // same to the caller: no caption, carry on.
      this.logger.warn(`yt-dlp could not read ${url}: ${String(error).slice(0, 200)}`);
      return { caption: null, uploader: null, thumbnail: null, durationSec: null };
    }
  }
}
