import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const BATCH = 50;
const INTERVAL_MS = 1000;

interface OutboxRow {
  id: string;
  exchange: string;
  routing_key: string;
  payload: unknown;
}

/**
 * Polling relay: claims unpublished outbox rows with FOR UPDATE SKIP LOCKED (safe across
 * the 2 replicas — each grabs a disjoint batch), publishes to RabbitMQ with confirms,
 * marks them published. A publish failure just bumps attempts → retried next tick.
 */
@Injectable()
export class OutboxRelay implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelay.name);
  private timer?: ReturnType<typeof setInterval>;
  private draining = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly amqp: AmqpConnection,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.drain(), INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /** Publish one batch of pending events. Returns how many were published. */
  async drain(): Promise<number> {
    if (this.draining) {
      return 0;
    }
    this.draining = true;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<OutboxRow[]>`
          SELECT id, exchange, routing_key, payload
          FROM outbox
          WHERE published_at IS NULL
          ORDER BY occurred_at
          LIMIT ${BATCH}
          FOR UPDATE SKIP LOCKED`;

        let published = 0;
        for (const row of rows) {
          try {
            await this.amqp.publish(row.exchange, row.routing_key, row.payload);
            await tx.$executeRaw`UPDATE outbox SET published_at = now() WHERE id = ${row.id}::uuid`;
            published++;
          } catch (error) {
            await tx.$executeRaw`UPDATE outbox SET attempts = attempts + 1 WHERE id = ${row.id}::uuid`;
            this.logger.error(`outbox publish failed ${row.id}: ${String(error)}`);
          }
        }
        return published;
      });
    } catch (error) {
      this.logger.error(`outbox drain error: ${String(error)}`);
      return 0;
    } finally {
      this.draining = false;
    }
  }
}
