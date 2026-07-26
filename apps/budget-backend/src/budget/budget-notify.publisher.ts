import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Injectable, Logger } from "@nestjs/common";
import { Exchanges, makeEvent, notifyRequestedDataSchema, RoutingKeys } from "@outegro/contracts";

/**
 * Outbound notifications from budget. Budget doesn't know the user's email (DB-per-service),
 * so it targets Telegram — notifications resolves the linked chat id and skips silently if
 * unlinked. Published best-effort (not via a transactional outbox): a budget threshold alert
 * is informational, not transaction-critical, so a lost publish is acceptable (unlike auth's
 * security alerts). `edu_notice` is the platform's generic subservice-notice template
 * ({ title, message }); reused here rather than adding a budget-specific template.
 */
@Injectable()
export class BudgetNotifyPublisher {
  private readonly logger = new Logger(BudgetNotifyPublisher.name);

  constructor(private readonly amqp: AmqpConnection) {}

  async alertCapExceeded(
    userId: string,
    capName: string,
    spentUsd: number,
    capUsd: number,
  ): Promise<void> {
    const over = spentUsd - capUsd;
    const title = "Over budget";
    const message = `You've exceeded your "${capName}" cap by $${over.toFixed(2)} (spent $${spentUsd.toFixed(2)} of $${capUsd.toFixed(2)}).`;
    await this.publish(userId, title, message);
  }

  private async publish(userId: string, title: string, message: string): Promise<void> {
    try {
      const data = notifyRequestedDataSchema.parse({
        userId,
        template: "edu_notice",
        channels: ["telegram"],
        to: {},
        locale: "ru",
        data: { title, message },
      });
      const event = makeEvent(RoutingKeys.NotifyRequested, 1, data);
      await this.amqp.publish(Exchanges.Notify, RoutingKeys.NotifyRequested, event);
    } catch (error) {
      this.logger.warn(`notify publish failed for ${userId}: ${String(error)}`);
    }
  }
}
