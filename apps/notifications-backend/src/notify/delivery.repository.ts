import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface DeliveryLogInput {
  eventId: string;
  channel: string;
  userId: string;
  template: string;
  status: "sent" | "failed" | "skipped";
  providerMessageId?: string;
  error?: string;
}

/** All Prisma access for notifications — explicit queries, no implicit fetches. */
@Injectable()
export class DeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Idempotency: has this (event, channel) already been delivered successfully? */
  async alreadySent(eventId: string, channel: string): Promise<boolean> {
    const row = await this.prisma.deliveryLog.findUnique({
      where: { delivery_event_channel_uq: { eventId, channel } },
      select: { status: true },
    });
    return row?.status === "sent";
  }

  /** Default-on: absence of a preference row means the channel is enabled. */
  async isChannelEnabled(userId: string, type: string, channel: string): Promise<boolean> {
    const pref = await this.prisma.preference.findUnique({
      where: { pref_user_type_channel_uq: { userId, type, channel } },
      select: { enabled: true },
    });
    return pref?.enabled ?? true;
  }

  async telegramChatId(userId: string): Promise<string | undefined> {
    const link = await this.prisma.telegramLink.findUnique({
      where: { userId },
      select: { chatId: true },
    });
    return link?.chatId;
  }

  /** Upsert keyed on (eventId, channel) so redelivery updates the same row. */
  async record(input: DeliveryLogInput): Promise<void> {
    await this.prisma.deliveryLog.upsert({
      where: { delivery_event_channel_uq: { eventId: input.eventId, channel: input.channel } },
      create: {
        eventId: input.eventId,
        channel: input.channel,
        userId: input.userId,
        template: input.template,
        status: input.status,
        providerMessageId: input.providerMessageId ?? null,
        error: input.error ?? null,
      },
      update: {
        status: input.status,
        providerMessageId: input.providerMessageId ?? null,
        error: input.error ?? null,
      },
    });
  }
}
