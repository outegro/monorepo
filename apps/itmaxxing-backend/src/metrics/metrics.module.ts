import { Module } from "@nestjs/common";
import { MetricsController } from "./metrics.controller";

/** Exposes GET /metrics (Prometheus). Metric objects live in metrics.ts (imported directly). */
@Module({ controllers: [MetricsController] })
export class MetricsModule {}
