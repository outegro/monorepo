import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import type { Env } from "../config/env.validation";

/**
 * ioredis client as an injectable service. Holds generated quiz answer keys
 * (`edu:quiz:<id>`) so the correct options never reach the browser — the client
 * submits answers and the server grades them against the stored copy.
 */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super(config.get("REDIS_URL", { infer: true }), { maxRetriesPerRequest: 3 });
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit();
  }
}
