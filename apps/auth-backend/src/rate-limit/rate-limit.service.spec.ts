import { describe, expect, it, vi } from "vitest";
import { RateLimitService } from "./rate-limit.service";

function makeRedis(count: number, ttl = 100) {
  return {
    incr: vi.fn().mockResolvedValue(count),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(ttl),
  };
}

describe("RateLimitService", () => {
  it("allows under the limit and sets the TTL on the first hit", async () => {
    const redis = makeRedis(1);
    const res = await new RateLimitService(redis as never).hit("request", "id", 5, 60);
    expect(res.allowed).toBe(true);
    expect(redis.expire).toHaveBeenCalledWith("rl:request:id", 60);
  });

  it("does not reset the TTL on subsequent hits in the window", async () => {
    const redis = makeRedis(3);
    await new RateLimitService(redis as never).hit("request", "id", 5, 60);
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it("blocks over the limit and reports retryAfter from the live TTL", async () => {
    const redis = makeRedis(6, 42);
    const res = await new RateLimitService(redis as never).hit("request", "id", 5, 60);
    expect(res.allowed).toBe(false);
    expect(res.retryAfter).toBe(42);
  });
});
