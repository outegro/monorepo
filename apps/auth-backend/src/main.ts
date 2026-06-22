import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";

/**
 * Bootstrap: NestJS + pino + graceful shutdown.
 * - bufferLogs + useLogger → pino replaces Nest's console logger.
 * - enableShutdownHooks → SIGTERM fires onModuleDestroy (close DB/broker once wired).
 * - trust proxy → behind Traefik + the BFF, honor X-Forwarded-For so `@Ip()` is the real client.
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  app.set("trust proxy", 1);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  app.get(Logger).log(`auth-backend listening on :${port}`);
}

void bootstrap();
