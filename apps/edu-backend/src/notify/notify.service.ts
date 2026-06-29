import { Injectable } from "@nestjs/common";
import { Exchanges, makeEvent, notifyRequestedDataSchema, RoutingKeys } from "@outegro/contracts";
import { OutboxService } from "./outbox.service";

/**
 * Publishes notifications to the platform `notify` exchange via the transactional outbox.
 * edu doesn't know the user's email (DB-per-service), so it targets Telegram — notifications
 * resolves the chat id from the user's linked account and skips if unlinked.
 */
@Injectable()
export class NotifyService {
  constructor(private readonly outbox: OutboxService) {}

  async notifyUser(userId: string, title: string, message: string): Promise<void> {
    const data = notifyRequestedDataSchema.parse({
      userId,
      template: "edu_notice",
      channels: ["telegram"],
      to: {},
      locale: "ru",
      data: { title, message },
    });
    const event = makeEvent(RoutingKeys.NotifyRequested, 1, data);
    await this.outbox.publish(Exchanges.Notify, event);
  }
}
