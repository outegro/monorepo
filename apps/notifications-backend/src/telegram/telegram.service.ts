import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation";
import { TelegramApi } from "./telegram-api.service";
import { TelegramLinksRepository } from "./telegram-links.repository";

interface TelegramUpdate {
  message?: { text?: string; chat?: { id?: number } };
}

/**
 * Handles the bot side of account linking: the user opens `t.me/<bot>?start=<nonce>`,
 * Telegram delivers `/start <nonce>` here, we resolve the nonce → userId via auth's
 * internal endpoint, persist the chat id, and confirm. Registers the webhook on boot.
 */
@Injectable()
export class TelegramService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly api: TelegramApi,
    private readonly links: TelegramLinksRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const secret = this.config.get("TELEGRAM_WEBHOOK_SECRET", { infer: true });
    if (!this.api.enabled || !secret) {
      this.logger.log("telegram webhook not configured (dormant)");
      return;
    }
    await this.api.setWebhook(this.config.get("TELEGRAM_WEBHOOK_URL", { infer: true }), secret);
  }

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const text = update.message?.text;
    const chatId = update.message?.chat?.id;
    if (!text || chatId === undefined) {
      return;
    }
    if (!text.startsWith("/start")) {
      return;
    }
    const nonce = text.split(/\s+/)[1]?.trim();
    if (!nonce) {
      await this.safeSend(
        String(chatId),
        "Open the link from your Outegro profile to connect this chat.",
      );
      return;
    }
    const userId = await this.consumeNonce(nonce);
    if (!userId) {
      await this.safeSend(
        String(chatId),
        "That link has expired — generate a new one in your Outegro profile.",
      );
      return;
    }
    await this.links.upsert(userId, String(chatId));
    this.logger.log(`telegram linked for user ${userId}`);
    // Confirmation is best-effort — the link is already saved; a send failure must not
    // 500 the webhook (Telegram would retry an already-processed update).
    await this.safeSend(
      String(chatId),
      "✅ Telegram connected. Security alerts will arrive here too.",
    );
  }

  private async safeSend(chatId: string, text: string): Promise<void> {
    try {
      await this.api.sendMessage(chatId, text);
    } catch (error) {
      this.logger.warn(`telegram confirmation send failed for ${chatId}: ${String(error)}`);
    }
  }

  /** Resolve a one-time link nonce → userId via auth-backend (internal, shared key). */
  private async consumeNonce(nonce: string): Promise<string | null> {
    const key = this.config.get("INTERNAL_API_KEY", { infer: true });
    if (!key) {
      return null;
    }
    const base = this.config.get("AUTH_API_BASE", { infer: true });
    const res = await fetch(`${base}/internal/telegram/consume`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-internal-key": key },
      body: JSON.stringify({ nonce }),
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json().catch(() => null)) as { userId?: string } | null;
    return data?.userId ?? null;
  }
}
