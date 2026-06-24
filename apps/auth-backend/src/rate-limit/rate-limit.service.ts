import { Injectable } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number; // seconds until the window resets
}

/**
 * Fixed-window rate limiter (Redis INCR + EXPIRE). Keyed per action+identifier
 * (e.g. request-code per email and per IP). Simple and sufficient; the attempts cap on
 * login codes is the second line of defense.
 */
@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  async hit(
    action: string,
    identifier: string,
    limit: number,
    windowSec: number,
  ): Promise<RateLimitResult> {
    const key = `rl:${action}:${identifier}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSec);
    }
    if (count > limit) {
      const ttl = await this.redis.ttl(key);
      return { allowed: false, retryAfter: ttl > 0 ? ttl : windowSec };
    }
    return { allowed: true, retryAfter: 0 };
  }
}
