import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation";
import { llmDuration, llmRequests, llmTokens } from "../metrics/metrics";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOpts {
  json?: boolean;
  temperature?: number;
  /** Per-call cap. Reasoning models need more headroom (else the answer cuts off mid-<think>). */
  maxTokens?: number;
  operation?: string;
}

/**
 * Minimal OpenAI-compatible chat client (MiniMax / OpenAI / Together / Groq …). The API key
 * is OPTIONAL: absent → `enabled = false` and callers degrade gracefully instead of crashing.
 * Reasoning models can wrap output in <think>…</think> — stripped. JSON-mode helper defensively
 * parses the first {...} block.
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

  get modelName(): string {
    return this.model;
  }

  /** Raw completion → assistant text (reasoning <think> blocks stripped). Metered. */
  async chat(messages: ChatMessage[], opts: ChatOpts = {}): Promise<string> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException({ code: "llm_disabled" });
    }
    const operation = opts.operation ?? "other";
    const labels = { operation, model: this.model };
    const done = llmDuration.startTimer(labels);

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
          max_tokens: opts.maxTokens ?? this.maxTokens,
          ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
    } catch (error) {
      done();
      llmRequests.inc({ ...labels, outcome: "unreachable" });
      this.logger.error(`llm request failed: ${String(error)}`);
      throw new ServiceUnavailableException({ code: "llm_unreachable" });
    }
    if (!res.ok) {
      done();
      llmRequests.inc({ ...labels, outcome: "error" });
      this.logger.error(`llm ${res.status}: ${(await res.text()).slice(0, 300)}`);
      throw new ServiceUnavailableException({ code: "llm_error" });
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        completion_tokens_details?: { reasoning_tokens?: number };
      };
    };
    const seconds = done();
    llmRequests.inc({ ...labels, outcome: "success" });
    // M2 is a reasoning model: reasoning_tokens are billed and usually dominate the cost,
    // so they are accounted separately from completion rather than folded into it.
    const u = data.usage;
    if (u) {
      if (u.prompt_tokens) llmTokens.inc({ ...labels, kind: "prompt" }, u.prompt_tokens);
      if (u.completion_tokens)
        llmTokens.inc({ ...labels, kind: "completion" }, u.completion_tokens);
      const reasoning = u.completion_tokens_details?.reasoning_tokens;
      if (reasoning) llmTokens.inc({ ...labels, kind: "reasoning" }, reasoning);
    }
    this.logger.log(
      `llm ${operation} ok ${seconds.toFixed(1)}s model=${this.model} ` +
        `prompt=${u?.prompt_tokens ?? 0} completion=${u?.completion_tokens ?? 0} ` +
        `reasoning=${u?.completion_tokens_details?.reasoning_tokens ?? 0}`,
    );
    const raw = data.choices?.[0]?.message?.content ?? "";
    return raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  }

  /** Completion expected to be JSON; returns parsed object or null on parse failure. */
  async chatJson<T = unknown>(messages: ChatMessage[], opts: ChatOpts = {}): Promise<T | null> {
    const text = await this.chat(messages, { json: true, temperature: 0.3, ...opts });
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
