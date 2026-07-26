import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Injectable, Logger } from "@nestjs/common";
import { LIVE_EXCHANGE, type LiveChangedMessage } from "./live.constants";

/**
 * Publishes a "this user's data changed" signal onto the `budget.live` fanout. Best-effort:
 * a failed publish must never fail the mutation the user just made (they see their own change
 * via the mutation's own query invalidation regardless — the fanout only drives OTHER tabs).
 */
@Injectable()
export class LivePublisher {
  private readonly logger = new Logger(LivePublisher.name);

  constructor(private readonly amqp: AmqpConnection) {}

  async publishChanged(userId: string): Promise<void> {
    try {
      const msg: LiveChangedMessage = { userId };
      await this.amqp.publish(LIVE_EXCHANGE, "", msg);
    } catch (error) {
      this.logger.warn(`live publish failed for ${userId}: ${String(error)}`);
    }
  }
}
