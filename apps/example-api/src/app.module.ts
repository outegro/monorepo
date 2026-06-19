import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { validate } from "./config/env.validation";
import { HealthModule } from "./health/health.module";
import { MessagingModule } from "./messaging/messaging.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { TaglinesModule } from "./taglines/taglines.module";

const isProd = process.env.NODE_ENV === "production";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: isProd ? "info" : "debug",
        transport: isProd ? undefined : { target: "pino-pretty", options: { singleLine: true } },
        redact: ["req.headers.authorization", "req.headers.cookie"],
        autoLogging: true,
      },
    }),
    // infra (global): Postgres, Redis, RabbitMQ
    PrismaModule,
    RedisModule,
    MessagingModule,
    HealthModule,
    // domain feature (throwaway demo): AI tagline generator over PG + Redis + RabbitMQ + MiniMax
    TaglinesModule,
  ],
})
export class AppModule {}
