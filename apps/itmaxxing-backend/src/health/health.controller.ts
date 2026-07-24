import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface DeepHealth {
  status: "ok" | "degraded";
  database: "up" | "down";
}

/** /health → liveness (cheap); /health/deep → readiness (pings Postgres → 503 if down). */
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
    const database = await this.prisma.$queryRaw`SELECT 1`
      .then((): "up" | "down" => "up")
      .catch((): "up" | "down" => "down");
    const status = database === "up" ? "ok" : "degraded";
    const body: DeepHealth = { status, database };
    if (status === "degraded") {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}
