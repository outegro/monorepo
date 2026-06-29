import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Minimal OpenAI-compatible chat client (works with MiniMax / OpenAI / Together / Groq …).
 * The API key is OPTIONAL: when absent the service reports `enabled = false` and callers
 * degrade gracefully instead of crashing. Reasoning models can wrap answers in <think> —
 * we strip that. JSON-mode helper parses the first {...} block defensively.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey?: string;
  private readonly maxTokens: number;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config.get("LLM_BASE_URL", { infer: true }).replace(/\/+$/, "");
    this.model = config.get("LLM_MODEL", { infer: true });
    this.apiKey = config.get("LLM_API_KEY", { infer: true })?.trim() || undefined;
    this.maxTokens = config.get("LLM_MAX_TOKENS", { infer: true });
  }

  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  /** Raw completion → assistant text (reasoning <think> blocks stripped). */
  async chat(messages: ChatMessage[], opts: { json?: boolean; temperature?: number } = {}) {
    if (!this.apiKey) {
      throw new ServiceUnavailableException({ code: "llm_disabled" });
    }
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: opts.temperature ?? 0.4,
          max_tokens: this.maxTokens,
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
    } catch (error) {
      this.logger.error(`llm request failed: ${String(error)}`);
      throw new ServiceUnavailableException({ code: "llm_unreachable" });
    }
    if (!res.ok) {
      this.logger.error(`llm ${res.status}: ${(await res.text()).slice(0, 300)}`);
      throw new ServiceUnavailableException({ code: "llm_error" });
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    return raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  }

  /** Completion expected to be JSON; returns parsed object or null on parse failure. */
  async chatJson<T = unknown>(messages: ChatMessage[]): Promise<T | null> {
    const text = await this.chat(messages, { json: true, temperature: 0.3 });
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}
