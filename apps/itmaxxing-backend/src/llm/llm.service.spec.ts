import { ServiceUnavailableException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LlmService } from "./llm.service";

function makeConfig(overrides: Partial<Record<string, unknown>> = {}) {
  const values: Record<string, unknown> = {
    LLM_BASE_URL: "https://api.minimax.io/v1",
    LLM_MODEL: "MiniMax-M2",
    LLM_API_KEY: "secret-key",
    LLM_MAX_TOKENS: 4096,
    ...overrides,
  };
  return { get: vi.fn((key: string) => values[key]) } as never;
}

function chatResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        choices: [{ message: { content } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
  } as Response;
}

describe("LlmService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("is disabled without an API key and chat() rejects with llm_disabled", async () => {
    const svc = new LlmService(makeConfig({ LLM_API_KEY: undefined }));
    expect(svc.enabled).toBe(false);
    await expect(svc.chat([{ role: "user", content: "hi" }])).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("is disabled when the key is only whitespace", () => {
    const svc = new LlmService(makeConfig({ LLM_API_KEY: "   " }));
    expect(svc.enabled).toBe(false);
  });

  it("strips <think> reasoning blocks from the returned text", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      chatResponse("<think>pondering…</think>The real answer"),
    );
    const svc = new LlmService(makeConfig());
    const text = await svc.chat([{ role: "user", content: "hi" }]);
    expect(text).toBe("The real answer");
  });

  it("wraps a network failure as llm_unreachable", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    const svc = new LlmService(makeConfig());
    await expect(svc.chat([{ role: "user", content: "hi" }])).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("wraps a non-2xx response as llm_error", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("internal error"),
    } as Response);
    const svc = new LlmService(makeConfig());
    await expect(svc.chat([{ role: "user", content: "hi" }])).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it("chatJson parses the first {...} block out of surrounding text", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      chatResponse('Sure, here it is:\n{"improved":"text","redFlags":[]}\nHope that helps.'),
    );
    const svc = new LlmService(makeConfig());
    const result = await svc.chatJson<{ improved: string }>([{ role: "user", content: "hi" }]);
    expect(result).toEqual({ improved: "text", redFlags: [] });
  });

  it("chatJson returns null when no JSON object is present", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(chatResponse("no json here"));
    const svc = new LlmService(makeConfig());
    expect(await svc.chatJson([{ role: "user", content: "hi" }])).toBeNull();
  });

  it("chatJson returns null on malformed JSON instead of throwing", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(chatResponse("{not: valid json}"));
    const svc = new LlmService(makeConfig());
    expect(await svc.chatJson([{ role: "user", content: "hi" }])).toBeNull();
  });
});
