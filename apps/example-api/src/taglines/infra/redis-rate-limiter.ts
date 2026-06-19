import { Injectable } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";
import type { RateLimiter } from "../domain/ports";

/**
 * Fixed-window rate limiter. INCR the key; on the first hit set the window TTL.
 * Returns allowed=false once the counter exceeds `limit`.
 */
@Injectable()
export class RedisRateLimiter implements RateLimiter {
  constructor(private readonly redis: RedisService) {}

  async consume(key: string, limit: number, windowSec: number): Promise<{ allowed: boolean }> {
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, windowSec);
    }
    return { allowed: count <= limit };
  }
}
