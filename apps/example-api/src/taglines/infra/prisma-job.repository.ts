import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { JobRepository, TaglineJob } from "../domain/ports";

/** Postgres-backed job store (Prisma). */
@Injectable()
export class PrismaJobRepository implements JobRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(prompt: string): Promise<TaglineJob> {
    return this.prisma.taglineJob.create({ data: { prompt } });
  }

  async markDone(id: string, taglines: string[]): Promise<void> {
    await this.prisma.taglineJob.update({
      where: { id },
      data: { status: "done", taglines, error: null, completedAt: new Date() },
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.taglineJob.update({
      where: { id },
      data: { status: "failed", error, completedAt: new Date() },
    });
  }

  findById(id: string): Promise<TaglineJob | null> {
    return this.prisma.taglineJob.findUnique({ where: { id } });
  }

  countDone(): Promise<number> {
    return this.prisma.taglineJob.count({ where: { status: "done" } });
  }
}
