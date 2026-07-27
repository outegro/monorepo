import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { KakaoService } from "../kakao/kakao.service";
import { LlmService } from "../llm/llm.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  type Candidate,
  type ConfirmInput,
  candidateSchema,
  type Extraction,
  extractionSchema,
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
  ) {}

  /**
   * Accept a pasted block of reels. Deliberately tolerant: a bad line is reported back but
   * never fails the batch — pasting 100 links and losing all of them to one typo would be
   * the single most annoying possible failure mode here.
   */
  async submitBatch(userId: string, text: string): Promise<BatchResult> {
    const invalid: string[] = [];
    const rows: { userId: string; url: string; shortcode: string; note: string | null }[] = [];
    const seen = new Set<string>();

    for (const line of text.split(/\r?\n/)) {
      const parsed = parseBatchLine(line);
      if (!parsed) continue;
      const shortcode = parseShortcode(parsed.url);
      if (!shortcode) {
        invalid.push(line.trim().slice(0, 120));
        continue;
      }
      // Dedupe inside the paste itself before hitting the DB constraint.
      if (seen.has(shortcode)) continue;
      seen.add(shortcode);
      rows.push({ userId, url: parsed.url, shortcode, note: parsed.note ?? null });
    }

    if (rows.length === 0) return { created: 0, duplicates: 0, invalid };

    const result = await this.prisma.reel.createMany({ data: rows, skipDuplicates: true });
    return {
      created: result.count,
      duplicates: rows.length - result.count,
      invalid,
    };
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

  /** Extract → search → park in NEEDS_REVIEW. Never throws: one bad row must not stop a run. */
  async processOne(id: string, url: string, note: string | null): Promise<void> {
    try {
      const extracted = note ? await this.extract(note, url) : {};
      const query = extracted.query ?? note ?? null;

      const candidates = query
        ? await this.kakao.search(query, {
            categoryGroup: extracted.categoryGroup,
            district: extracted.district,
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
   * The one moment a place becomes real. Upserts so re-confirming a reel (picked the wrong
   * candidate first time) corrects the row instead of exploding on the unique constraint.
   */
  async confirm(userId: string, id: string, input: ConfirmInput) {
    const reel = await this.prisma.reel.findFirst({ where: { id, userId } });
    if (!reel) throw new NotFoundException({ code: "reel_not_found" });

    const chosen = this.pickCandidate(reel.candidates, input);
    if (!chosen) throw new NotFoundException({ code: "candidate_not_found" });

    const data = {
      userId,
      kakaoId: chosen.kakaoId,
      name: chosen.name,
      categoryGroup: chosen.categoryGroup,
      categoryName: chosen.categoryName,
      address: chosen.address,
      roadAddress: chosen.roadAddress,
      phone: chosen.phone,
      kakaoUrl: chosen.kakaoUrl,
      lat: chosen.lat,
      lng: chosen.lng,
      priceNote: input.priceNote ?? this.priceFrom(reel.extracted),
      tags: input.tags ?? [],
      day: input.day ?? null,
    };

    const [place] = await this.prisma.$transaction([
      this.prisma.place.upsert({
        where: { reelId: id },
        create: { reelId: id, ...data },
        update: data,
      }),
      this.prisma.reel.update({
        where: { id },
        data: { status: "CONFIRMED", candidates: undefined },
      }),
    ]);
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

  private priceFrom(extracted: unknown): string | null {
    const parsed = extractionSchema.safeParse(extracted);
    return parsed.success ? (parsed.data.priceHint ?? null) : null;
  }
}
