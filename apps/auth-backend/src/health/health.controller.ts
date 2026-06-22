import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";

/**
 * Health endpoints:
 *  - GET /health      → liveness (cheap, no deps; don't kill the pod on a dep blip)
 *  - GET /health/deep → readiness. No external deps yet; add DB/Redis/broker pings
 *    here as they're wired — return 503 if any dependency is down.
 *
 * Wired by k8s probes: livenessProbe → /health, readinessProbe → /health/deep.
 */
@Controller("health")
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  health(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("deep")
  @HttpCode(HttpStatus.OK)
  deep(): { status: "ok" } {
    return { status: "ok" };
  }
}
