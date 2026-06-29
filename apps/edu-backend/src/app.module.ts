import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { CatalogModule } from "./catalog/catalog.module";
import { validate } from "./config/env.validation";
import { HealthModule } from "./health/health.module";
import { LearningModule } from "./learning/learning.module";
import { LlmModule } from "./llm/llm.module";
import { NotifyModule } from "./notify/notify.module";
import { PrismaModule } from "./prisma/prisma.module";

const isProd = process.env.NODE_ENV === "production";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate, envFilePath: [".env"] }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: isProd ? "info" : "debug",
        transport: isProd ? undefined : { target: "pino-pretty", options: { singleLine: true } },
        redact: ["req.headers.authorization", "req.headers.cookie"],
        autoLogging: true,
      },
    }),
    PrismaModule,
    LlmModule,
    NotifyModule,
    CatalogModule,
    LearningModule,
    HealthModule,
  ],
})
export class AppModule {}
