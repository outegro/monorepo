import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  isMandatory,
  type NotificationChannel,
  type NotifyRequestedEvent,
} from "@outegro/contracts";
import {
  CHANNEL_ADAPTERS,
  type DeliveryTarget,
  type NotificationChannelAdapter,
} from "../channels/channel-adapter";
import { renderNotification } from "../emails/render";
import { DeliveryRepository } from "./delivery.repository";

/**
 * Fan a notify.requested event out to its channels:
 *  - render the template once (locale-aware),
 *  - honor per-user preferences (mandatory templates ignore them),
 *  - idempotent per (event, channel),
 *  - best-effort per channel: a missing target → skipped (no throw); a real send
 *    failure → throw, so the consumer nacks the whole event to the DLX.
 */
@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  private readonly adapters: Map<NotificationChannel, NotificationChannelAdapter>;

  constructor(
    @Inject(CHANNEL_ADAPTERS) adapters: NotificationChannelAdapter[],
    private readonly repo: DeliveryRepository,
  ) {
    this.adapters = new Map(adapters.map((adapter) => [adapter.channel, adapter]));
  }

  async deliver(event: NotifyRequestedEvent): Promise<void> {
    const { template, locale, userId } = event.data;
    const message = await renderNotification(template, locale, event.data.data);
    if (!message) {
      this.logger.warn(`unknown template "${template}" — dropping ${event.id}`);
      return;
    }

    for (const channel of await this.resolveChannels(event)) {
      const adapter = this.adapters.get(channel);
      if (!adapter) {
        await this.skip(event, channel, "no adapter registered");
        continue;
      }
      if (await this.repo.alreadySent(event.id, channel)) {
        continue;
      }

      const target = await this.resolveTarget(event, channel);
      if (!adapter.canDeliver(target)) {
        await this.skip(event, channel, "no target");
        continue;
      }

      try {
        const result = await adapter.send(target, message);
        await this.repo.record({
          eventId: event.id,
          channel,
          userId,
          template,
          status: "sent",
          providerMessageId: result.providerMessageId,
        });
        this.logger.log(`delivered ${template} via ${channel} (${event.id})`);
      } catch (error) {
        await this.repo.record({
          eventId: event.id,
          channel,
          userId,
          template,
          status: "failed",
          error: String(error),
        });
        throw error; // bubble up → consumer nacks to DLX
      }
    }
  }

  /** Mandatory templates always go; others respect the per-user preference matrix. */
  private async resolveChannels(event: NotifyRequestedEvent): Promise<NotificationChannel[]> {
    if (isMandatory(event.data.template)) {
      return event.data.channels;
    }
    const allowed: NotificationChannel[] = [];
    for (const channel of event.data.channels) {
      if (await this.repo.isChannelEnabled(event.data.userId, event.data.template, channel)) {
        allowed.push(channel);
      }
    }
    return allowed;
  }

  private async resolveTarget(
    event: NotifyRequestedEvent,
    channel: NotificationChannel,
  ): Promise<DeliveryTarget> {
    if (channel === "email") {
      return { email: event.data.to.email };
    }
    if (channel === "telegram") {
      return {
        telegramChatId:
          event.data.to.telegramChatId ?? (await this.repo.telegramChatId(event.data.userId)),
      };
    }
    return {};
  }

  private async skip(
    event: NotifyRequestedEvent,
    channel: NotificationChannel,
    reason: string,
  ): Promise<void> {
    await this.repo.record({
      eventId: event.id,
      channel,
      userId: event.data.userId,
      template: event.data.template,
      status: "skipped",
      error: reason,
    });
    this.logger.log(`skipped ${channel} for ${event.id}: ${reason}`);
  }
}
