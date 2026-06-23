import type { NotificationChannel } from "@outegro/contracts";
import type { RenderedMessage } from "../emails/render";

/** What a channel needs to reach the user — resolved per-channel by DeliveryService. */
export interface DeliveryTarget {
  email?: string;
  telegramChatId?: string;
}

export interface ChannelSendResult {
  providerMessageId?: string;
}

/**
 * SOLID port: one adapter per channel. Adding a channel = a new class registered in
 * the multi-provider — zero changes to DeliveryService (open/closed). No `switch`.
 */
export interface NotificationChannelAdapter {
  readonly channel: NotificationChannel;
  /** Can this channel deliver for the resolved target? (e.g. telegram needs a chat id) */
  canDeliver(target: DeliveryTarget): boolean;
  send(target: DeliveryTarget, message: RenderedMessage): Promise<ChannelSendResult>;
}

/** DI token for the injected array of channel adapters. */
export const CHANNEL_ADAPTERS = "CHANNEL_ADAPTERS";
