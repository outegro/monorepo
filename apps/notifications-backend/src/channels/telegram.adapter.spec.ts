import { describe, expect, it, vi } from "vitest";
import { TelegramAdapter } from "./telegram.adapter";

describe("TelegramAdapter", () => {
  it("can deliver only with a chat id", () => {
    const adapter = new TelegramAdapter({} as never);
    expect(adapter.canDeliver({ telegramChatId: "123" })).toBe(true);
    expect(adapter.canDeliver({})).toBe(false);
  });

  it("sends subject + body text to the chat", async () => {
    const api = { sendMessage: vi.fn() };
    const adapter = new TelegramAdapter(api as never);
    await adapter.send(
      { telegramChatId: "42" },
      { subject: "Security alert", html: "<p>x</p>", text: "New sign-in." },
    );
    expect(api.sendMessage).toHaveBeenCalledWith("42", "Security alert\n\nNew sign-in.");
  });
});
