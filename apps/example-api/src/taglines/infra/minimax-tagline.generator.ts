import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.validation";
import type { TaglineGenerator } from "../domain/ports";

const SYSTEM_PROMPT =
  "You are a world-class brand copywriter. Given a product description, write 5 short, punchy, " +
  "distinct taglines (max 7 words each). No numbering, no quotes, no explanations. " +
  'Respond with ONLY a JSON array of 5 strings, e.g. ["First tagline","Second tagline"].';

interface ChatCompletion {
  choices?: { message?: { content?: string } }[];
  base_resp?: { status_code?: number; status_msg?: string };
}

/**
 * MiniMax adapter (OpenAI-compatible `/v1/chat/completions`). The only class that
 * knows the model/endpoint — swapping providers means a new adapter, untouched
 * domain (DIP/OCP). Uses native fetch (Node 24), no SDK.
 */
@Injectable()
export class MiniMaxTaglineGenerator implements TaglineGenerator {
  private readonly logger = new Logger(MiniMaxTaglineGenerator.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get("MINIMAX_API_KEY", { infer: true });
    this.baseUrl = config.get("MINIMAX_BASE_URL", { infer: true });
    this.model = config.get("MINIMAX_MODEL", { infer: true });
  }

  async generate(prompt: string): Promise<string[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Product: ${prompt}` },
          ],
          max_tokens: 512,
          temperature: 1,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`minimax http ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
      const data = (await res.json()) as ChatCompletion;
      if (data.base_resp?.status_code && data.base_resp.status_code !== 0) {
        throw new Error(
          `minimax error ${data.base_resp.status_code}: ${data.base_resp.status_msg}`,
        );
      }

      const content = data.choices?.[0]?.message?.content ?? "";
      const taglines = this.parse(content);
      if (taglines.length === 0) throw new Error("model returned no taglines");
      return taglines.slice(0, 5);
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Strip `<think>…</think>`, then prefer a JSON array, fall back to lines. */
  private parse(content: string): string[] {
    const cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start !== -1 && end > start) {
      try {
        const arr = JSON.parse(cleaned.slice(start, end + 1));
        if (Array.isArray(arr)) {
          return arr.map((s) => String(s).trim()).filter(Boolean);
        }
      } catch {
        this.logger.debug("minimax JSON parse failed, falling back to line split");
      }
    }

    return cleaned
      .split("\n")
      .map((line) =>
        line
          .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
          .replace(/^["']|["']$/g, "")
          .trim(),
      )
      .filter(Boolean);
  }
}
