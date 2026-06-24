import { Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const USER_SELECT = {
  id: true,
  email: true,
  emailVerified: true,
  locale: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type UserRecord = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

/** Explicit-column user queries (no implicit relation loads — CLAUDE.md hard rule). */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(
    email: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<UserRecord | null> {
    return db.user.findUnique({ where: { email }, select: USER_SELECT });
  }

  findById(id: string, db: Prisma.TransactionClient = this.prisma): Promise<UserRecord | null> {
    return db.user.findUnique({ where: { id }, select: USER_SELECT });
  }

  create(email: string, db: Prisma.TransactionClient = this.prisma): Promise<UserRecord> {
    return db.user.create({ data: { email }, select: USER_SELECT });
  }

  async markEmailVerified(id: string, db: Prisma.TransactionClient = this.prisma): Promise<void> {
    await db.user.update({ where: { id }, data: { emailVerified: true } });
  }
}
