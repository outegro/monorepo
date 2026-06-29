import { z } from "zod";

/**
 * Env schema, Zod-validated on boot (fail-fast). The LLM key is OPTIONAL — without it the
 * AI features degrade gracefully (homework check / ask / quiz fall back or return a clear
 * "not configured" message) but the service still boots and serves chapters.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),

  // Stores
  DATABASE_URL: z.url(),
  RABBITMQ_URL: z.string().min(1).default("amqp://guest:guest@localhost:5672"),

  // Auth: verify access tokens against auth-backend's JWKS (in-cluster). Stateless — no
  // Redis; near-real-time revocation is handled at the BFF / by the short access TTL.
  JWKS_URL: z.string().min(1).default("http://auth-backend:80/.well-known/jwks.json"),
  JWT_ISSUER: z.string().min(1).default("https://id.outegro.com"),
  JWT_AUDIENCE: z.string().min(1).default("outegro"),

  // Roles that may edit the catalog (admin surface on the site).
  ADMIN_ROLES: z.string().min(1).default("edu:admin,outegro:admin"),

  // LLM (OpenAI-compatible chat/completions). Key optional (feature dormant until sealed).
  LLM_BASE_URL: z.string().min(1).default("https://api.minimax.io/v1"),
  LLM_MODEL: z.string().min(1).default("MiniMax-M2"),
  LLM_API_KEY: z.string().trim().optional(),
  LLM_MAX_TOKENS: z.coerce.number().default(4096),
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
