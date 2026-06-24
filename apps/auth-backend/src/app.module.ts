import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { AuthModule } from "./auth/auth.module";
import { validate } from "./config/env.validation";
import { GoogleModule } from "./google/google.module";
import { HealthModule } from "./health/health.module";
import { HelloModule } from "./hello/hello.module";
import { MessagingModule } from "./messaging/rabbitmq.module";
import { OutboxModule } from "./outbox/outbox.module";
import { PasskeysModule } from "./passkeys/passkeys.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { TokensModule } from "./tokens/tokens.module";

const isProd = process.env.NODE_ENV === "production";
// Tests inject env directly (testcontainers) — never read the dev `.env`, whose
// localhost URLs would shadow the per-test container endpoints.
const isTest = process.env.NODE_ENV === "test";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: [".env"],
      ignoreEnvFile: isTest,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: isProd ? "info" : "debug",
        transport: isProd ? undefined : { target: "pino-pretty", options: { singleLine: true } },
        redact: ["req.headers.authorization", "req.headers.cookie"],
        autoLogging: true,
      },
    }),
    PrismaModule,
    RedisModule,
    MessagingModule,
    TokensModule,
    OutboxModule,
    AuthModule,
    PasskeysModule,
    GoogleModule,
    HealthModule,
    HelloModule,
  ],
})
export class AppModule {}
