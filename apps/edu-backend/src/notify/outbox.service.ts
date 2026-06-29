import { Injectable } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/** The shape produced by `makeEvent` (@outegro/contracts). */
export interface OutboxableEvent {
  id: string;
  type: string;
  occurredAt: string;
  version: number;
  data: unknown;
}

/**
 * Transactional outbox writer. `enqueue` persists an event in the SAME transaction as
 * the business change (atomic — no lost or phantom events); the relay publishes it.
 * `publish` is a convenience for side-effect events that don't share a business tx.
 */
@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(
    tx: Prisma.TransactionClient,
    exchange: string,
    event: OutboxableEvent,
  ): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        id: event.id,
        exchange,
        routingKey: event.type,
        payload: event as unknown as Prisma.InputJsonValue,
        occurredAt: new Date(event.occurredAt),
      },
    });
  }

  async publish(exchange: string, event: OutboxableEvent): Promise<void> {
    await this.prisma.$transaction((tx) => this.enqueue(tx, exchange, event));
  }
}
