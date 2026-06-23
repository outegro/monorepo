import { Nack, RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Injectable, Logger } from "@nestjs/common";
import { Exchanges, NotifyTopology, notifyRequestedEventSchema } from "@outegro/contracts";
import { DeliveryService } from "./delivery.service";

/**
 * Consumes notify.requested. Validates the envelope (Zod, fail-closed), delivers, and
 * acks. Bad payloads and delivery failures are Nacked WITHOUT requeue → dead-lettered
 * to notify.dlx → parked in notify.dlq for inspection.
 */
@Injectable()
export class NotifyConsumer {
  private readonly logger = new Logger(NotifyConsumer.name);

  constructor(private readonly delivery: DeliveryService) {}

  @RabbitSubscribe({
    exchange: Exchanges.Notify,
    routingKey: NotifyTopology.pattern,
    queue: NotifyTopology.queue,
    queueOptions: {
      durable: true,
      arguments: {
        "x-queue-type": "quorum",
        "x-dead-letter-exchange": NotifyTopology.deadLetterExchange,
      },
    },
  })
  async handle(raw: unknown): Promise<Nack | undefined> {
    const parsed = notifyRequestedEventSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.error(`invalid notify.requested → DLX: ${parsed.error.message}`);
      return new Nack(false);
    }
    try {
      await this.delivery.deliver(parsed.data);
      return undefined; // ack
    } catch (error) {
      this.logger.error(`delivery failed → DLX (${parsed.data.id}): ${String(error)}`);
      return new Nack(false);
    }
  }
}
