import { Injectable } from "@nestjs/common";
import { RedisService } from "../../redis/redis.service";
import type { JobCache, TaglineJobView } from "../domain/ports";

const VIEW_TTL_SEC = 3600;
const PROMPT_TTL_SEC = 86_400;
const DONE_COUNTER = "taglines:done";

/** Redis read-through cache: job views, prompt memoization, done counter. */
@Injectable()
export class RedisJobCache implements JobCache {
  constructor(private readonly redis: RedisService) {}

  async putView(view: TaglineJobView): Promise<void> {
    await this.redis.client.set(this.viewKey(view.id), JSON.stringify(view), "EX", VIEW_TTL_SEC);
  }

  async getView(id: string): Promise<TaglineJobView | null> {
    const raw = await this.redis.client.get(this.viewKey(id));
    return raw === null ? null : (JSON.parse(raw) as TaglineJobView);
  }

  async rememberPrompt(promptHash: string, taglines: string[]): Promise<void> {
    await this.redis.client.set(
      this.promptKey(promptHash),
      JSON.stringify(taglines),
      "EX",
      PROMPT_TTL_SEC,
    );
  }

  async recallPrompt(promptHash: string): Promise<string[] | null> {
    const raw = await this.redis.client.get(this.promptKey(promptHash));
    return raw === null ? null : (JSON.parse(raw) as string[]);
  }

  async incrDone(): Promise<void> {
    await this.redis.client.incr(DONE_COUNTER);
  }

  async doneCount(): Promise<number | null> {
    const raw = await this.redis.client.get(DONE_COUNTER);
    return raw === null ? null : Number(raw);
  }

  private viewKey(id: string): string {
    return `taglines:job:${id}`;
  }
  private promptKey(hash: string): string {
    return `taglines:prompt:${hash}`;
  }
}
