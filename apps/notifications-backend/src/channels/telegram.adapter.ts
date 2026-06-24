import { Injectable } from "@nestjs/common";
import type { RenderedMessage } from "../emails/render";
import { TelegramApi } from "../telegram/telegram-api.service";
import type {
  ChannelSendResult,
  DeliveryTarget,
  NotificationChannelAdapter,
} from "./channel-adapter";

/**
 * Telegram channel. The chat id is resolved by DeliveryService from telegram_links;
 * we send the plain-text rendering (Telegram has no HTML email shell).
 */
@Injectable()
export class TelegramAdapter implements NotificationChannelAdapter {
  readonly channel = "telegram" as const;

  constructor(private readonly api: TelegramApi) {}

  canDeliver(target: DeliveryTarget): boolean {
    return Boolean(target.telegramChatId);
  }

  async send(target: DeliveryTarget, message: RenderedMessage): Promise<ChannelSendResult> {
    if (!target.telegramChatId) {
      throw new Error("telegram target missing");
    }
    const text = message.subject ? `${message.subject}\n\n${message.text}` : message.text;
    await this.api.sendMessage(target.telegramChatId, text);
    return {};
  }
}
