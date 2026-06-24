import { z } from "zod";

/**
 * Env schema, Zod-validated on boot (fail-fast). Provider keys are optional so the
 * service boots in dev without them (EmailAdapter logs instead of sending; Telegram
 * stays dormant until its secrets land).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.url(),
  // RabbitMQ — the event bus this service consumes from.
  RABBITMQ_URL: z.string().min(1).default("amqp://guest:guest@localhost:5672"),
  // Email (Resend). Without a key, EmailAdapter logs the message instead of sending.
  RESEND_API_KEY: z.string().trim().optional(),
  RESEND_FROM: z.string().min(1).default("Outegro <noreply@outegro.com>"),
  // Telegram bot (sending + webhook validation). Dormant until provided.
  TELEGRAM_BOT_TOKEN: z.string().trim().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().trim().optional(),
  // Public URL Telegram should call (the id-web BFF forwards to /telegram/webhook here).
  TELEGRAM_WEBHOOK_URL: z.string().min(1).default("https://id.outegro.com/api/telegram/webhook"),
  // auth-backend base for /internal/telegram/consume (resolve a link nonce → userId).
  AUTH_API_BASE: z.string().min(1).default("http://auth-backend:80"),
  // Shared secret for internal service-to-service calls (auth ↔ notifications).
  INTERNAL_API_KEY: z.string().trim().optional(),
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
