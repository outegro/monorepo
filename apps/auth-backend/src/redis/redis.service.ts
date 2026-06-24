import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import type { Env } from "../config/env.validation";

/**
 * ioredis client as an injectable service (it IS the Redis client). Holds sessions
 * (`sessrt:<sid>`), login-code/rate-limit/OAuth-state keys. Lua scripts run here.
 */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super(config.get("REDIS_URL", { infer: true }), {
      // Fail fast instead of queueing commands forever if Redis is down.
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit();
  }
}
