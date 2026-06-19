import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";

/**
 * Bootstrap. NestJS + pino + graceful shutdown.
 * - bufferLogs + useLogger(Logger) → pino replaces Nest's default console logger.
 * - enableShutdownHooks → on SIGTERM fires onModuleDestroy (Prisma disconnect, broker close, etc.).
 * - trust proxy → behind Traefik + the BFF, honor X-Forwarded-For so `@Ip()` is the
 *   real client (per-client rate limiting, not per-BFF-pod).
 *
 * On SIGTERM: stop accepting new connections, drain in-flight HTTP, nack in-flight
 * RabbitMQ, close DB/Redis. Idempotency on event handlers makes redelivery safe.
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  app.set("trust proxy", 1);

  // 3000 по умолчанию — совпадает с containerPort/probe-портом chart'а (outegro-service).
  // Локально .env ставит 3001, чтобы не конфликтовать с фронтом на 3000.
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  app.get(Logger).log(`api listening on :${port}`);
}

void bootstrap();
