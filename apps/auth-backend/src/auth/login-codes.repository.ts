import { Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const CODE_SELECT = {
  id: true,
  userId: true,
  codeHash: true,
  expiresAt: true,
  attempts: true,
} satisfies Prisma.LoginCodeSelect;

export type LoginCodeRecord = Prisma.LoginCodeGetPayload<{ select: typeof CODE_SELECT }>;

@Injectable()
export class LoginCodesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    codeHash: string,
    expiresAt: Date,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await db.loginCode.create({ data: { userId, codeHash, expiresAt } });
  }

  /** Newest unconsumed, unexpired code for the user (the one we just emailed). */
  findActive(userId: string): Promise<LoginCodeRecord | null> {
    return this.prisma.loginCode.findFirst({
      where: { userId, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: CODE_SELECT,
    });
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.prisma.loginCode.update({ where: { id }, data: { attempts: { increment: 1 } } });
  }

  async consume(id: string): Promise<void> {
    await this.prisma.loginCode.update({ where: { id }, data: { consumedAt: new Date() } });
  }
}
