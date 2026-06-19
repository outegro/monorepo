import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

type DepStatus = "up" | "down";
interface DeepHealth {
  status: "ok" | "degraded";
  database: DepStatus;
  cache: DepStatus;
  messaging: DepStatus;
}

/**
 * Health endpoints:
 *  - GET /health       → liveness, cheap, no deps (don't kill the pod on a dep blip)
 *  - GET /health/deep  → readiness, pings Postgres + Redis + RabbitMQ → 503 if any down
 *
 * Wired by k8s probes: livenessProbe → /health, readinessProbe → /health/deep.
 */
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly amqp: AmqpConnection,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  health(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("deep")
  async deep(): Promise<DeepHealth> {
    const [database, cache] = await Promise.all([
      this.check(() => this.prisma.$queryRaw`SELECT 1`),
      this.check(() => this.redis.ping()),
    ]);
    const messaging: DepStatus = this.amqp.managedConnection.isConnected() ? "up" : "down";

    const body: DeepHealth = {
      status: database === "up" && cache === "up" && messaging === "up" ? "ok" : "degraded",
      database,
      cache,
      messaging,
    };
    if (body.status === "degraded") {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }

  private async check(probe: () => Promise<unknown>): Promise<DepStatus> {
    try {
      await probe();
      return "up";
    } catch {
      return "down";
    }
  }
}
