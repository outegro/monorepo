import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { LlmService } from "../llm/llm.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  type CreateEntryInput,
  type IntakeReview,
  intakeReviewSchema,
  type StructureResult,
  structureResultSchema,
  type UpdateEntryInput,
  type UpdateProfileInput,
} from "./lore.contracts";
import { intakeReviewMessages, structureMessages } from "./lore.prompts";

/**
 * The lore-intake hook (design §2.1): brain-dump → LLM review (improved text + red flags) →
 * structure into canonical lore_entries. Every LLM pass is persisted in `generations` for
 * cache/audit. LLM output is validated defensively (a malformed field is coerced/dropped, not
 * fatal) so a flaky model never 500s the UI.
 */
@Injectable()
export class LoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
  ) {}

  status(): { llmEnabled: boolean; model: string } {
    return { llmEnabled: this.llm.enabled, model: this.llm.modelName };
  }

  // ── Profile ──

  async getProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    return profile ?? { userId, headline: null, targetRole: null, locale: "en" };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    return this.prisma.profile.upsert({
      where: { userId },
      create: { userId, ...input },
      update: input,
    });
  }

  // ── Intake step 2: review ──

  async review(userId: string, text: string): Promise<IntakeReview> {
    const raw = await this.llm.chatJson<unknown>(intakeReviewMessages(text), {
      operation: "intake_review",
      maxTokens: 4096,
    });
    if (!raw) {
      throw new ServiceUnavailableException({ code: "llm_bad_output" });
    }
    const parsed = intakeReviewSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ServiceUnavailableException({ code: "llm_bad_output" });
    }
    await this.prisma.generation.create({
      data: {
        userId,
        kind: "intake_review",
        input: text,
        output: parsed.data,
        model: this.llm.modelName,
      },
    });
    return parsed.data;
  }

  // ── Intake step 3: structure into lore_entries ──

  async structure(userId: string, text: string): Promise<StructureResult> {
    const raw = await this.llm.chatJson<unknown>(structureMessages(text), {
      operation: "structure",
      maxTokens: 4096,
    });
    const parsed = structureResultSchema.safeParse(raw ?? {});
    if (!parsed.success || parsed.data.entries.length === 0) {
      throw new ServiceUnavailableException({ code: "llm_bad_output" });
    }

    const base = await this.prisma.loreEntry.count({ where: { userId } });
    const result = await this.prisma.$transaction(async (tx) => {
      const created: StructureResult["entries"] = [];
      let order = base;
      for (const e of parsed.data.entries) {
        await tx.loreEntry.create({
          data: {
            userId,
            type: e.type,
            title: e.title,
            org: e.org ?? null,
            startDate: e.startDate ?? null,
            endDate: e.endDate ?? null,
            body: e.body,
            metrics: e.metrics,
            tags: e.tags,
            order: order++,
          },
        });
        created.push(e);
      }
      await tx.generation.create({
        data: {
          userId,
          kind: "structure",
          input: text,
          output: parsed.data,
          model: this.llm.modelName,
        },
      });
      return { entries: created };
    });
    return result;
  }

  // ── lore_entries CRUD ──

  listEntries(userId: string) {
    return this.prisma.loreEntry.findMany({
      where: { userId },
      orderBy: { order: "asc" },
    });
  }

  async createEntry(userId: string, input: CreateEntryInput) {
    const last = await this.prisma.loreEntry.findFirst({
      where: { userId },
      orderBy: { order: "desc" },
    });
    return this.prisma.loreEntry.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        org: input.org ?? null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        body: input.body ?? "",
        metrics: input.metrics ?? [],
        tags: input.tags ?? [],
        order: (last?.order ?? -1) + 1,
      },
    });
  }

  async updateEntry(userId: string, id: string, input: UpdateEntryInput) {
    await this.assertOwner(userId, id);
    return this.prisma.loreEntry.update({
      where: { id },
      data: {
        ...input,
        org: input.org === undefined ? undefined : input.org,
      },
    });
  }

  async deleteEntry(userId: string, id: string): Promise<void> {
    await this.assertOwner(userId, id);
    await this.prisma.loreEntry.delete({ where: { id } });
  }

  private async assertOwner(userId: string, id: string): Promise<void> {
    const owned = await this.prisma.loreEntry.findFirst({ where: { id, userId } });
    if (!owned) throw new NotFoundException({ code: "lore_entry_not_found" });
  }
}
