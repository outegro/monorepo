import { Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const ENTITLEMENT_SELECT = {
  id: true,
  service: true,
  role: true,
  source: true,
  expiresAt: true,
} satisfies Prisma.EntitlementSelect;

export type EntitlementRecord = Prisma.EntitlementGetPayload<{ select: typeof ENTITLEMENT_SELECT }>;

/**
 * Authoritative grants. Roles are ALWAYS derived from this table at token-mint time —
 * never trusted from a stale access token (contract: tokens carry roles only as a hint).
 */
@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** `service:role` strings for live (non-expired) grants. */
  async getRoles(userId: string): Promise<string[]> {
    const rows = await this.prisma.entitlement.findMany({
      where: { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { service: true, role: true },
    });
    return rows.map((r) => `${r.service}:${r.role}`);
  }

  list(userId: string): Promise<EntitlementRecord[]> {
    return this.prisma.entitlement.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: ENTITLEMENT_SELECT,
    });
  }
}
