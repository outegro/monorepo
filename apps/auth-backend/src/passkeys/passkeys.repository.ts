import { Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const PUBLIC_SELECT = {
  id: true,
  credentialId: true,
  transports: true,
  deviceType: true,
  backedUp: true,
  name: true,
  createdAt: true,
} satisfies Prisma.WebauthnCredentialSelect;

export type PasskeyRecord = Prisma.WebauthnCredentialGetPayload<{ select: typeof PUBLIC_SELECT }>;

export interface NewCredential {
  userId: string;
  credentialId: string;
  publicKey: Uint8Array;
  counter: number;
  transports: string[];
  deviceType: string | null;
  backedUp: boolean;
  name: string | null;
}

@Injectable()
export class PasskeysRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(c: NewCredential): Promise<void> {
    await this.prisma.webauthnCredential.create({
      data: {
        userId: c.userId,
        credentialId: c.credentialId,
        publicKey: Buffer.from(c.publicKey),
        counter: c.counter,
        transports: c.transports,
        deviceType: c.deviceType,
        backedUp: c.backedUp,
        name: c.name,
      },
    });
  }

  listByUser(userId: string): Promise<PasskeyRecord[]> {
    return this.prisma.webauthnCredential.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: PUBLIC_SELECT,
    });
  }

  /** Existing credentials for the excludeCredentials list (avoid double-registration). */
  forExclude(userId: string): Promise<Array<{ credentialId: string; transports: string[] }>> {
    return this.prisma.webauthnCredential.findMany({
      where: { userId },
      select: { credentialId: true, transports: true },
    });
  }

  /** Full record (incl. publicKey + counter) for an authentication ceremony. */
  findByCredentialId(credentialId: string) {
    return this.prisma.webauthnCredential.findUnique({
      where: { credentialId },
      select: {
        id: true,
        userId: true,
        credentialId: true,
        publicKey: true,
        counter: true,
        transports: true,
      },
    });
  }

  async updateCounter(id: string, counter: number): Promise<void> {
    await this.prisma.webauthnCredential.update({ where: { id }, data: { counter } });
  }

  /** Returns how many rows were deleted (0 ⇒ not owned by this user). */
  async deleteForUser(userId: string, id: string): Promise<number> {
    const r = await this.prisma.webauthnCredential.deleteMany({ where: { id, userId } });
    return r.count;
  }
}
