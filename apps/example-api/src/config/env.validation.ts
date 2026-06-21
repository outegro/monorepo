import { z } from "zod";

/**
 * Env schema. Zod-validated on boot via @nestjs/config. Service refuses to start
 * with bad env. This demo touches all three infra pieces, so DATABASE_URL,
 * REDIS_URL and RABBITMQ_URL are all required (fail-fast if any is missing).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  RABBITMQ_URL: z.url(),
  // MiniMax (OpenAI-compatible). Key is a runtime secret (Sealed Secret in k8s).
  // Model/base are env-tunable so you can point at whatever your key supports.
  // .trim(): a stray trailing newline/space from how the secret was pasted would
  // corrupt the `Authorization: Bearer <key>` header → MiniMax 401 "carry the API
  // secret key". Trimming makes auth robust to that.
  MINIMAX_API_KEY: z.string().trim().min(1),
  MINIMAX_BASE_URL: z.url().default("https://api.minimax.io/v1"),
  MINIMAX_MODEL: z.string().default("MiniMax-M3"),
  // M3 is a reasoning model: it spends time on a <think> block before answering,
  // so end-to-end latency runs 15–45s. A hardcoded 30s abort was clipping slow
  // generations — make it tunable and default it generously.
  MINIMAX_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  // generate attempts allowed per IP within the window (Redis-backed rate limit)
  GENERATE_RATE_LIMIT: z.coerce.number().default(5),
  GENERATE_RATE_WINDOW_SEC: z.coerce.number().default(60),
});

export type Env = z.infer<typeof envSchema>;

/** Passed to ConfigModule.forRoot({ validate }). Fail-fast on bad env. */
export function validate(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${JSON.stringify(z.treeifyError(parsed.error), null, 2)}`,
    );
  }
  return parsed.data;
}
