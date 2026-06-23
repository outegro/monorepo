import type { NotifyRequestedEvent } from "@outegro/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationChannelAdapter } from "../channels/channel-adapter";
import type { DeliveryRepository } from "./delivery.repository";
import { DeliveryService } from "./delivery.service";

function buildEvent(overrides: Partial<NotifyRequestedEvent["data"]> = {}): NotifyRequestedEvent {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    type: "notify.requested",
    occurredAt: new Date().toISOString(),
    version: 1,
    data: {
      userId: "u1",
      template: "login_code",
      channels: ["email"],
      to: { email: "a@b.com" },
      locale: "ru",
      data: { code: "123456" },
      ...overrides,
    },
  };
}

describe("DeliveryService", () => {
  let send: ReturnType<typeof vi.fn>;
  let adapter: NotificationChannelAdapter;
  let repo: DeliveryRepository;
  let record: ReturnType<typeof vi.fn>;
  let alreadySent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    send = vi.fn(async () => ({ providerMessageId: "msg_1" }));
    adapter = {
      channel: "email",
      canDeliver: (target) => Boolean(target.email),
      send,
    };
    record = vi.fn(async () => {});
    alreadySent = vi.fn(async () => false);
    repo = {
      alreadySent,
      isChannelEnabled: vi.fn(async () => true),
      telegramChatId: vi.fn(async () => undefined),
      record,
    } as unknown as DeliveryRepository;
  });

  it("delivers a mandatory email and logs it as sent", async () => {
    const service = new DeliveryService([adapter], repo);
    await service.deliver(buildEvent());

    expect(send).toHaveBeenCalledOnce();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "email", status: "sent", providerMessageId: "msg_1" }),
    );
  });

  it("is idempotent — skips a channel already sent", async () => {
    alreadySent.mockResolvedValueOnce(true);
    const service = new DeliveryService([adapter], repo);
    await service.deliver(buildEvent());

    expect(send).not.toHaveBeenCalled();
  });

  it("skips (no throw) when the target is missing", async () => {
    const service = new DeliveryService([adapter], repo);
    await service.deliver(buildEvent({ to: {} }));

    expect(send).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ status: "skipped" }));
  });

  it("records a failure and rethrows so the consumer nacks to the DLX", async () => {
    send.mockRejectedValueOnce(new Error("resend down"));
    const service = new DeliveryService([adapter], repo);

    await expect(service.deliver(buildEvent())).rejects.toThrow("resend down");
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
  });

  it("skips a requested channel with no registered adapter", async () => {
    const service = new DeliveryService([adapter], repo);
    await service.deliver(buildEvent({ channels: ["telegram"], to: { telegramChatId: "c1" } }));

    expect(send).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "telegram", status: "skipped" }),
    );
  });
});
