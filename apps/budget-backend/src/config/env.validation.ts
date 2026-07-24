import { z } from "zod";

/** Env schema, Zod-validated on boot (fail-fast). */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),

  // Store
  DATABASE_URL: z.url(),
  RABBITMQ_URL: z.string().min(1).default("amqp://guest:guest@localhost:5672"),

  // Auth: verify access tokens against auth-backend's JWKS (in-cluster). Stateless — no
  // Redis; near-real-time revocation is handled at the BFF / by the short access TTL.
  JWKS_URL: z.string().min(1).default("http://auth-backend:80/.well-known/jwks.json"),
  JWT_ISSUER: z.string().min(1).default("https://id.outegro.com"),
  JWT_AUDIENCE: z.string().min(1).default("outegro"),

  // Live FX rates (open.er-api.com — free, no key). Refreshed on a schedule + cached.
  FX_API_URL: z.string().min(1).default("https://open.er-api.com/v6/latest/USD"),

  // Live sync (WebSocket). Same-origin in prod (browser → budget.outegro.com/socket.io,
  // Traefik routes the path to this backend), so the httpOnly og_access cookie flows on
  // the handshake. In dev the frontend is a different port → set to http://localhost:3005.
  WS_CORS_ORIGIN: z.string().min(1).default("https://budget.outegro.com"),
  ACCESS_COOKIE: z.string().min(1).default("og_access"),
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
