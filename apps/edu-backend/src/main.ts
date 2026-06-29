import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";

/** Bootstrap: NestJS + pino + graceful shutdown (mirrors the other Outegro backends). */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  app.set("trust proxy", 1);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
  app.get(Logger).log(`edu-backend listening on :${port}`);
}

void bootstrap();
