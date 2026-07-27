import { z } from "zod";

/** Env schema, Zod-validated on boot (fail-fast). */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),

  // Store
  DATABASE_URL: z.url(),

  // Auth: verify access tokens against auth-backend's JWKS (in-cluster). Stateless — no
  // Redis; near-real-time revocation is handled at the BFF / by the short access TTL.
  JWKS_URL: z.string().min(1).default("http://auth-backend:80/.well-known/jwks.json"),
  JWT_ISSUER: z.string().min(1).default("https://id.outegro.com"),
  JWT_AUDIENCE: z.string().min(1).default("outegro"),

  // LLM (OpenAI-compatible chat/completions). Key OPTIONAL — without it reels are still
  // accepted and go straight to manual review, they just skip query extraction. Shares the
  // platform MiniMax key with itmaxxing.
  LLM_BASE_URL: z.string().min(1).default("https://api.minimax.io/v1"),
  LLM_MODEL: z.string().min(1).default("MiniMax-M2"),
  LLM_API_KEY: z.string().trim().optional(),
  LLM_MAX_TOKENS: z.coerce.number().default(1024),

  // Kakao Local (place search). Korea-only mapping: Google has no usable directions or POI
  // coverage there because of the map-export restrictions, and Naver Cloud charges for Maps
  // from the first call and gates signup behind Korean identity verification. Kakao gives a
  // free monthly quota, an ordinary Kakao account is enough, and its category-group codes
  // (FD6 food / CE7 cafe / AT4 attraction / CT1 culture) map onto this catalogue directly.
  // OPTIONAL: without it reels queue up as NEEDS_REVIEW with no candidates instead of failing.
  KAKAO_REST_API_KEY: z.string().trim().optional(),
  KAKAO_LOCAL_BASE_URL: z.string().min(1).default("https://dapi.kakao.com"),
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
