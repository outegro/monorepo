import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

interface DeepHealth {
  status: "ok" | "degraded";
  database: "up" | "down";
  redis: "up" | "down";
}

/**
 * Health endpoints:
 *  - GET /health      → liveness (cheap, no deps; don't kill the pod on a dep blip)
 *  - GET /health/deep → readiness, pings Postgres + Redis → 503 if either is down.
 *
 * Wired by k8s probes: livenessProbe → /health, readinessProbe → /health/deep.
 */
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  health(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("deep")
  async deep(): Promise<DeepHealth> {
    const [database, redis] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`
        .then((): "up" | "down" => "up")
        .catch((): "up" | "down" => "down"),
      this.redis
        .ping()
        .then((): "up" | "down" => "up")
        .catch((): "up" | "down" => "down"),
    ]);
    const status = database === "up" && redis === "up" ? "ok" : "degraded";
    const body: DeepHealth = { status, database, redis };
    if (status === "degraded") {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}
