import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { KakaoService } from "../kakao/kakao.service";
import { LlmService } from "../llm/llm.service";
import { PrismaService } from "../prisma/prisma.service";
import { ReelMetaService } from "./reel-meta.service";
import {
  type Candidate,
  type ConfirmInput,
  candidateSchema,
  type Extraction,
  extractionSchema,
  guessKind,
  parseBatchLine,
  parseShortcode,
} from "./reels.contracts";
import { extractionMessages } from "./reels.prompts";

export interface BatchResult {
  created: number;
  duplicates: number;
  invalid: string[];
}

@Injectable()
export class ReelsService {
  private readonly logger = new Logger(ReelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly kakao: KakaoService,
    private readonly reelMeta: ReelMetaService,
  ) {}

  /**
   * Accept a pasted block of reels. Deliberately tolerant: a bad line is reported back but
   * never fails the batch — pasting 100 links and losing all of them to one typo would be
   * the single most annoying possible failure mode here.
   */
  async submitBatch(
    userId: string,
    input: { reels?: { url: string; note?: string }[]; text?: string },
  ): Promise<BatchResult> {
    const invalid: string[] = [];
    const rows: { userId: string; url: string; shortcode: string; note: string | null }[] = [];
    const seen = new Set<string>();

    // Form entries first, then anything pasted as a block. Both end up in the same shape.
    const entries: { url: string; note?: string }[] = [...(input.reels ?? [])];
    for (const line of (input.text ?? "").split(/\r?\n/)) {
      const parsed = parseBatchLine(line);
      if (parsed) entries.push(parsed);
    }

    for (const parsed of entries) {
      if (!parsed.url.trim()) continue;
      const shortcode = parseShortcode(parsed.url);
      if (!shortcode) {
        invalid.push(parsed.url.trim().slice(0, 120));
        continue;
      }
      // Dedupe inside the paste itself before hitting the DB constraint.
      if (seen.has(shortcode)) continue;
      seen.add(shortcode);
      rows.push({
        userId,
        url: parsed.url.trim(),
        shortcode,
        note: parsed.note?.trim() || null,
      });
    }

    if (rows.length === 0) return { created: 0, duplicates: 0, invalid };

    const result = await this.prisma.reel.createMany({ data: rows, skipDuplicates: true });

    // Kick processing off immediately and do NOT await it: reading a caption and searching
    // Kakao takes a few seconds per reel, and the submit response should not sit on that. The
    // rows are already PENDING, so the UI shows them as processing and polls them to done —
    // a "find places" button for something the user obviously wants was just a wrong default.
    void this.processPending(userId, rows.length).catch((e) =>
      this.logger.warn(`background processing after submit failed: ${String(e)}`),
    );

    return {
      created: result.count,
      duplicates: rows.length - result.count,
      invalid,
    };
  }

  /** Remove a reel outright, and with it any place that existed only because of it. */
  async remove(userId: string, id: string) {
    const reel = await this.prisma.reel.findFirst({
      where: { id, userId },
      include: { place: { include: { _count: { select: { reels: true } } } } },
    });
    if (!reel) throw new NotFoundException({ code: "reel_not_found" });

    // A place shared with other reels stays; one that only this reel produced goes with it.
    if (reel.place && reel.place._count.reels <= 1) {
      await this.prisma.place.delete({ where: { id: reel.place.id } });
    }
    await this.prisma.reel.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Run extraction + Kakao search over everything still waiting. Sequential on purpose:
   * this is one user with ~100 rows on a shared single node, and hammering the LLM and Kakao
   * concurrently would buy seconds while risking rate limits on both.
   */
  async processPending(userId: string, limit = 25): Promise<{ processed: number }> {
    const pending = await this.prisma.reel.findMany({
      where: { userId, status: { in: ["PENDING", "FAILED"] } },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    let processed = 0;
    for (const reel of pending) {
      await this.processOne(reel.id, reel.url, reel.note);
      processed += 1;
    }
    return { processed };
  }

  /**
   * Read caption → extract → search → park in NEEDS_REVIEW. Never throws: one bad row must
   * not stop a run.
   *
   * The caption is fetched first and is the primary signal — a Korean reel usually names the
   * place outright, which no amount of guessing from a URL can match. The human's note is the
   * fallback, and when both exist they are concatenated: the note often carries the intent
   * ("for breakfast") that the caption does not.
   */
  async processOne(id: string, url: string, note: string | null): Promise<void> {
    try {
      const meta = await this.reelMeta.fetch(url);
      if (meta.caption || meta.uploader || meta.videoUrl) {
        await this.prisma.reel.update({
          where: { id },
          data: {
            caption: meta.caption,
            uploader: meta.uploader,
            thumbnail: meta.thumbnail,
            videoUrl: meta.videoUrl,
          },
        });
      }

      // The uploader handle goes in too: for small businesses it is often the name itself
      // (`catssarangchae` → 고양이사랑채, measured).
      const source =
        [meta.caption, note, meta.uploader && `@${meta.uploader}`]
          .filter(Boolean)
          .join("\n\n")
          .trim() || null;
      const extracted = source ? await this.extract(source, url) : {};
      const query = extracted.query ?? note ?? null;

      // An address alone is enough — a place with no usable name still resolves from it.
      const candidates =
        query || extracted.address || extracted.queryKo
          ? await this.kakao.search(query ?? "", {
              categoryGroup: extracted.categoryGroup,
              district: extracted.district,
              address: extracted.address,
              queryAlt: extracted.queryAlt,
              queryKo: extracted.queryKo,
            })
          : [];

      await this.prisma.reel.update({
        where: { id },
        data: {
          status: "NEEDS_REVIEW",
          extracted: extracted as object,
          candidates: candidates as unknown as object,
          error: null,
        },
      });
    } catch (error) {
      this.logger.warn(`processing reel ${id} failed: ${String(error)}`);
      await this.prisma.reel
        .update({
          where: { id },
          data: { status: "FAILED", error: String(error).slice(0, 500) },
        })
        .catch(() => undefined);
    }
  }

  /** Note → search hints. Returns {} when the LLM is off or answers with junk. */
  private async extract(note: string, url: string): Promise<Extraction> {
    if (!this.llm.enabled) return {};
    const raw = await this.llm.chatJson<unknown>(extractionMessages(note, url), {
      operation: "reel_extract",
      maxTokens: 512,
    });
    const parsed = extractionSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.debug(`extraction did not match schema for ${url}`);
      return {};
    }
    return parsed.data;
  }

  /** The review queue: oldest first, so a long paste is worked through in submission order. */
  async listForReview(userId: string, take = 50) {
    return this.prisma.reel.findMany({
      where: { userId, status: { in: ["NEEDS_REVIEW", "PENDING", "FAILED"] } },
      orderBy: { createdAt: "asc" },
      take,
    });
  }

  async counts(userId: string) {
    const grouped = await this.prisma.reel.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    });
    return Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
  }

  /**
   * Fresh playable URLs for a reel, resolved on demand.
   *
   * Deliberately not stored. Instagram's CDN links are signed and short-lived, so a copy in our
   * own bucket would need downloading, storing and serving ~5MB per reel — for a two-week trip
   * where the video is watched once, during review, to remember why it was saved. Resolving
   * takes about two seconds and is always current.
   */
  async media(userId: string, id: string) {
    const reel = await this.prisma.reel.findFirst({ where: { id, userId } });
    if (!reel) throw new NotFoundException({ code: "reel_not_found" });
    return this.reelMeta.mediaUrls(reel.url);
  }

  /** Re-run Kakao with a query the reviewer typed by hand, when the guess was useless. */
  async researchAgain(
    userId: string,
    id: string,
    query: string,
    categoryGroup?: Candidate["categoryGroup"],
  ) {
    const reel = await this.prisma.reel.findFirst({ where: { id, userId } });
    if (!reel) throw new NotFoundException({ code: "reel_not_found" });

    const candidates = await this.kakao.search(query, {
      categoryGroup: (categoryGroup ?? undefined) as never,
    });
    await this.prisma.reel.update({
      where: { id },
      data: { candidates: candidates as unknown as object, status: "NEEDS_REVIEW" },
    });
    return candidates;
  }

  async updateNote(userId: string, id: string, note: string | null) {
    const reel = await this.prisma.reel.findFirst({ where: { id, userId } });
    if (!reel) throw new NotFoundException({ code: "reel_not_found" });
    // A new note invalidates the old guess — send it back through the pipeline.
    return this.prisma.reel.update({
      where: { id },
      data: { note, status: "PENDING", candidates: undefined, error: null },
    });
  }

  async skip(userId: string, id: string) {
    const reel = await this.prisma.reel.findFirst({ where: { id, userId } });
    if (!reel) throw new NotFoundException({ code: "reel_not_found" });
    return this.prisma.reel.update({ where: { id }, data: { status: "SKIPPED" } });
  }

  /**
   * The one moment a place becomes real.
   *
   * Keyed on (userId, kakaoId), not on the reel: several reels legitimately describe the same
   * restaurant, and confirming the second one must attach to the existing place rather than
   * drop a duplicate pin next to it. So this upserts the PLACE and then points the reel at it.
   *
   * Fields that a human has curated on an existing place — day, tags, priceNote — are only
   * written when this call actually supplies them. Otherwise confirming a second reel onto a
   * place already scheduled for day 3 would silently unschedule it.
   */
  async confirm(userId: string, id: string, input: ConfirmInput) {
    const reel = await this.prisma.reel.findFirst({ where: { id, userId } });
    if (!reel) throw new NotFoundException({ code: "reel_not_found" });

    const chosen = this.pickCandidate(reel.candidates, input);
    if (!chosen) throw new NotFoundException({ code: "candidate_not_found" });

    const kind = input.kind ?? guessKind(chosen.categoryName);
    const waypoints = input.waypoints ?? [];
    // For a route the navigable coordinate is the START, not whatever Kakao ranked first —
    // for a hike that is usually the summit, and routing to a summit is useless.
    const start = kind === "ROUTE" ? waypoints.find((w) => w.role === "start") : undefined;

    const identity = {
      name: chosen.name,
      categoryGroup: chosen.categoryGroup,
      categoryName: chosen.categoryName,
      address: chosen.address,
      roadAddress: chosen.roadAddress,
      phone: chosen.phone,
      kakaoUrl: chosen.kakaoUrl,
      lat: start?.lat ?? chosen.lat,
      lng: start?.lng ?? chosen.lng,
      kind,
      ...(waypoints.length > 0 ? { waypoints: waypoints as unknown as object } : {}),
    };
    const curated = {
      ...(input.priceNote !== undefined ? { priceNote: input.priceNote } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.durationMin !== undefined ? { durationMin: input.durationMin } : {}),
      ...(input.distanceKm !== undefined ? { distanceKm: input.distanceKm } : {}),
    };

    const [place] = await this.prisma.$transaction([
      this.prisma.place.upsert({
        where: { userId_kakaoId: { userId, kakaoId: chosen.kakaoId } },
        create: {
          userId,
          kakaoId: chosen.kakaoId,
          ...identity,
          priceNote: input.priceNote ?? this.priceFrom(reel.extracted),
          tags: input.tags ?? [],
          durationMin: input.durationMin ?? this.numFrom(reel.extracted, "durationMin"),
          distanceKm: input.distanceKm ?? this.numFrom(reel.extracted, "distanceKm"),
        },
        // Refresh Kakao's own data (it can change), keep whatever the human set.
        update: { ...identity, ...curated },
      }),
      this.prisma.reel.update({
        where: { id },
        data: { status: "CONFIRMED", candidates: undefined },
      }),
    ]);

    await this.prisma.reel.update({ where: { id }, data: { placeId: place.id } });
    return place;
  }

  private pickCandidate(stored: unknown, input: ConfirmInput): Candidate | null {
    if (input.candidate) {
      const parsed = candidateSchema.safeParse(input.candidate);
      return parsed.success ? parsed.data : null;
    }
    if (input.candidateIndex === undefined || !Array.isArray(stored)) return null;
    const parsed = candidateSchema.safeParse(stored[input.candidateIndex]);
    return parsed.success ? parsed.data : null;
  }

  /** Pull a numeric hint the LLM extracted, when the reviewer did not override it. */
  private numFrom(extracted: unknown, key: "durationMin" | "distanceKm"): number | null {
    const v = (extracted as Record<string, unknown> | null)?.[key];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }

  private priceFrom(extracted: unknown): string | null {
    const parsed = extractionSchema.safeParse(extracted);
    return parsed.success ? (parsed.data.priceHint ?? null) : null;
  }
}
