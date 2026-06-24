import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation";
import { TelegramService } from "./telegram.service";
import { TelegramLinksRepository } from "./telegram-links.repository";

@Controller()
export class TelegramController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly telegram: TelegramService,
    private readonly links: TelegramLinksRepository,
  ) {}

  /** Telegram webhook (validated by the secret header it echoes back). */
  @Post("telegram/webhook")
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Body() update: unknown,
    @Headers("x-telegram-bot-api-secret-token") secret?: string,
  ): Promise<{ ok: true }> {
    const expected = this.config.get("TELEGRAM_WEBHOOK_SECRET", { infer: true });
    if (!expected || secret !== expected) {
      throw new ForbiddenException({ code: "bad_webhook_secret" });
    }
    await this.telegram.handleUpdate(update as never);
    return { ok: true };
  }

  /** Internal (BFF, shared key): is this user's Telegram linked? */
  @Get("internal/telegram/status")
  async status(
    @Query("userId") userId: string,
    @Headers("x-internal-key") key?: string,
  ): Promise<{ linked: boolean }> {
    this.assertInternal(key);
    return { linked: Boolean(userId) && (await this.links.exists(userId)) };
  }

  /** Internal (BFF, shared key): unlink this user's Telegram. */
  @Post("internal/telegram/unlink")
  async unlink(
    @Body() body: { userId?: string },
    @Headers("x-internal-key") key?: string,
  ): Promise<{ removed: boolean }> {
    this.assertInternal(key);
    return { removed: Boolean(body.userId) && (await this.links.remove(body.userId as string)) };
  }

  private assertInternal(key?: string): void {
    const expected = this.config.get("INTERNAL_API_KEY", { infer: true });
    if (!expected || key !== expected) {
      throw new ForbiddenException({ code: "forbidden" });
    }
  }
}
