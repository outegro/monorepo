import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation";

/** Thin Telegram Bot API client. Dormant (logs) without a bot token. */
@Injectable()
export class TelegramApi {
  private readonly logger = new Logger(TelegramApi.name);
  private readonly token: string | undefined;

  constructor(config: ConfigService<Env, true>) {
    this.token = config.get("TELEGRAM_BOT_TOKEN", { infer: true });
  }

  get enabled(): boolean {
    return Boolean(this.token);
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.token) {
      this.logger.warn(`DEV telegram (no token) → ${chatId}: ${text}`);
      return;
    }
    const res = await fetch(this.url("sendMessage"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      throw new Error(`telegram sendMessage ${res.status}`);
    }
  }

  /** Idempotent webhook registration (called on boot). */
  async setWebhook(url: string, secret: string): Promise<void> {
    if (!this.token) {
      return;
    }
    const res = await fetch(this.url("setWebhook"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, secret_token: secret, allowed_updates: ["message"] }),
    });
    if (res.ok) {
      this.logger.log(`telegram webhook registered → ${url}`);
    } else {
      this.logger.error(`telegram setWebhook failed ${res.status}`);
    }
  }

  private url(method: string): string {
    return `https://api.telegram.org/bot${this.token}/${method}`;
  }
}
