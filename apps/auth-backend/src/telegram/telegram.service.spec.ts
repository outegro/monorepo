import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { TelegramService } from "./telegram.service";

function build(username?: string) {
  const config = { get: (k: string) => ({ TELEGRAM_BOT_USERNAME: username })[k] };
  const redis = { set: vi.fn(), getdel: vi.fn() };
  return { svc: new TelegramService(config as never, redis as never), redis };
}

describe("auth TelegramService", () => {
  it("mints a t.me deep-link and stores the nonce → userId", async () => {
    const { svc, redis } = build("outegro_bot");
    const { url } = await svc.createLinkToken("u1");
    expect(url).toMatch(/^https:\/\/t\.me\/outegro_bot\?start=[a-f0-9]{32}$/);
    const nonce = url.split("start=")[1];
    expect(redis.set).toHaveBeenCalledWith(`tg:link:${nonce}`, "u1", "EX", 600);
  });

  it("stays dormant (503) without a bot username", async () => {
    const { svc } = build(undefined);
    await expect(svc.createLinkToken("u1")).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("consumes a nonce atomically via GETDEL", async () => {
    const { svc, redis } = build("b");
    redis.getdel.mockResolvedValue("u9");
    expect(await svc.consume("n")).toBe("u9");
    expect(redis.getdel).toHaveBeenCalledWith("tg:link:n");
  });
});
