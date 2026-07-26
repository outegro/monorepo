import { Controller, Get, Header } from "@nestjs/common";
import { registry } from "./metrics";

/** Prometheus scrape endpoint (ServiceMonitor → :3000/metrics). Public; carries no secrets. */
@Controller("metrics")
export class MetricsController {
  @Get()
  @Header("content-type", "text/plain; version=0.0.4; charset=utf-8")
  metrics(): Promise<string> {
    return registry.metrics();
  }
}
