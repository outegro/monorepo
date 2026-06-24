import { Injectable } from "@nestjs/common";
import type { ClientContext } from "../common/client-context";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const SESSION_SELECT = {
  id: true,
  userId: true,
  authMethod: true,
  userAgent: true,
  ip: true,
  country: true,
  city: true,
  createdAt: true,
  lastActiveAt: true,
} satisfies Prisma.SessionSelect;

export type SessionRecord = Prisma.SessionGetPayload<{ select: typeof SESSION_SELECT }>;

/**
 * Session rows = metadata only (tokens live in Redis). Pure persistence; revocation
 * orchestration (Redis + events) lives in AuthService, which composes this.
 */
@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    userId: string,
    authMethod: string,
    ctx: ClientContext,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<SessionRecord> {
    return db.session.create({
      data: {
        userId,
        authMethod,
        userAgent: ctx.userAgent,
        ip: ctx.ip,
        country: ctx.country,
        city: ctx.city,
      },
      select: SESSION_SELECT,
    });
  }

  findById(id: string): Promise<SessionRecord | null> {
    return this.prisma.session.findUnique({ where: { id }, select: SESSION_SELECT });
  }

  listActive(userId: string): Promise<SessionRecord[]> {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastActiveAt: "desc" },
      select: SESSION_SELECT,
    });
  }

  /** Best-effort activity bump on refresh — must never fail the request. */
  async touch(id: string, ctx: ClientContext): Promise<void> {
    try {
      await this.prisma.session.update({
        where: { id },
        data: { lastActiveAt: new Date(), ...(ctx.ip ? { ip: ctx.ip } : {}) },
      });
    } catch {
      // session may already be gone; activity tracking is non-critical
    }
  }

  /** Idempotent revoke (updateMany → no throw if already revoked/absent). */
  async revoke(
    id: string,
    reason: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await db.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }
}
