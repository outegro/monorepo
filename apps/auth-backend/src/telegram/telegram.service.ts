import { randomBytes } from "node:crypto";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation";
import { RedisService } from "../redis/redis.service";

const NONCE_TTL = 600; // seconds

/**
 * Telegram account linking (auth side). Mints a one-time nonce → userId in Redis and
 * builds the bot deep-link; notifications consumes the nonce (internal call) when the
 * user presses Start. The nonce is single-use (atomic GETDEL on consume).
 */
@Injectable()
export class TelegramService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly redis: RedisService,
  ) {}

  async createLinkToken(userId: string): Promise<{ url: string }> {
    const username = this.config.get("TELEGRAM_BOT_USERNAME", { infer: true });
    if (!username) {
      throw new ServiceUnavailableException({ code: "telegram_disabled" });
    }
    const nonce = randomBytes(16).toString("hex");
    await this.redis.set(this.key(nonce), userId, "EX", NONCE_TTL);
    return { url: `https://t.me/${username}?start=${nonce}` };
  }

  /** Atomic single-use resolution of a link nonce → userId. */
  async consume(nonce: string): Promise<string | null> {
    return this.redis.getdel(this.key(nonce));
  }

  private key(nonce: string): string {
    return `tg:link:${nonce}`;
  }
}
