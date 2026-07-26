import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { LoggerModule } from "nestjs-pino";
import { BudgetModule } from "./budget/budget.module";
import { CommonModule } from "./common/common.module";
import { validate } from "./config/env.validation";
import { FxModule } from "./fx/fx.module";
import { HealthModule } from "./health/health.module";
import { LiveModule } from "./live/live.module";
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
    ScheduleModule.forRoot(),
    CommonModule,
    PrismaModule,
    FxModule,
    LiveModule,
    BudgetModule,
    HealthModule,
  ],
})
export class AppModule {}
