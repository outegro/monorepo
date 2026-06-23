import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { validate } from "./config/env.validation";
import { HealthModule } from "./health/health.module";
import { HelloModule } from "./hello/hello.module";
import { MessagingModule } from "./messaging/rabbitmq.module";
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
    MessagingModule,
    NotifyModule,
    HealthModule,
    HelloModule,
  ],
})
export class AppModule {}
