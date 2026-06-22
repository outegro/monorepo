import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface DeepHealth {
  status: "ok" | "degraded";
  database: "up" | "down";
}

/**
 * Health endpoints:
 *  - GET /health      → liveness (cheap, no deps; don't kill the pod on a dep blip)
 *  - GET /health/deep → readiness, pings Postgres → 503 if down. Add Redis/broker
 *    checks here as they're wired.
 *
 * Wired by k8s probes: livenessProbe → /health, readinessProbe → /health/deep.
 */
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  health(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("deep")
  async deep(): Promise<DeepHealth> {
    let database: "up" | "down" = "down";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = "up";
    } catch {
      database = "down";
    }
    const body: DeepHealth = { status: database === "up" ? "ok" : "degraded", database };
    if (body.status === "degraded") {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}
