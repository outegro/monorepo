import { z } from "zod";

/**
 * Env schema, Zod-validated on boot (fail-fast). JWT_PRIVATE_KEY is required (no
 * signing key = no auth). Provider/admin keys are optional until their features land.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),

  // Stores
  DATABASE_URL: z.url(),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  RABBITMQ_URL: z.string().min(1).default("amqp://guest:guest@localhost:5672"),

  // JWT signing (ES256). PEM (PKCS8) private key for the P-256 curve. The public side
  // is exposed via JWKS; subservices verify against it.
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_ISSUER: z.string().min(1).default("https://id.outegro.com"),
  JWT_AUDIENCE: z.string().min(1).default("outegro"),

  // Token lifetimes (seconds)
  ACCESS_TTL: z.coerce.number().default(300), // 5 min — revocation handled by liveness
  REFRESH_TTL: z.coerce.number().default(2_592_000), // 30 days
  CODE_TTL: z.coerce.number().default(600), // 10 min

  // WebAuthn / passkeys. RP_ID is the registrable domain (works across *.outegro.com);
  // RP_ORIGIN is where the ceremony runs (the id-web BFF origin).
  WEBAUTHN_RP_ID: z.string().min(1).default("outegro.com"),
  WEBAUTHN_RP_ORIGIN: z.string().min(1).default("https://id.outegro.com"),
  WEBAUTHN_RP_NAME: z.string().min(1).default("Outegro"),

  // Cookies / origin
  PUBLIC_ORIGIN: z.url().default("https://id.outegro.com"),
  COOKIE_DOMAIN: z.string().min(1).default(".outegro.com"),
  REFRESH_COOKIE: z.string().min(1).default("outegro_refresh"),

  // Service-to-service / admin (optional until their endpoints land)
  INTERNAL_API_KEY: z.string().trim().optional(),
  ADMIN_API_KEY: z.string().trim().optional(),
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
