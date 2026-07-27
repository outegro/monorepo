import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { CommonModule } from "./common/common.module";
import { validate } from "./config/env.validation";
import { HealthModule } from "./health/health.module";
import { KakaoModule } from "./kakao/kakao.module";
import { LlmModule } from "./llm/llm.module";
import { MetricsModule } from "./metrics/metrics.module";
import { PlacesModule } from "./places/places.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ReelsModule } from "./reels/reels.module";
import { TripModule } from "./trip/trip.module";

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
    CommonModule,
    PrismaModule,
    LlmModule,
    KakaoModule,
    PlacesModule,
    ReelsModule,
    TripModule,
    MetricsModule,
    HealthModule,
  ],
})
export class AppModule {}
