import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createLocalJWKSet, jwtVerify } from "jose";
import type { Env } from "../config/env.validation";
import { TokensService } from "../tokens/tokens.service";
import type { AuthUser } from "./current-user.decorator";

/**
 * Verifies the Bearer access token against the local JWKS (signature + iss/aud), then
 * checks session liveness in Redis (fail-closed). This is auth-backend's OWN protected
 * surface — it has direct Redis, so it does the liveness check itself (defense-in-depth;
 * subservices rely on their BFF for liveness and do JWKS-only).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokensService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user?: AuthUser }>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException({ code: "unauthorized" });
    }

    let userId: string;
    let sessionId: string;
    let roles: string[];
    try {
      const jwks = createLocalJWKSet(this.tokens.jwks());
      const { payload } = await jwtVerify(header.slice(7), jwks, {
        issuer: this.config.get("JWT_ISSUER", { infer: true }),
        audience: this.config.get("JWT_AUDIENCE", { infer: true }),
      });
      userId = String(payload.sub ?? "");
      sessionId = String(payload.sid ?? "");
      roles = Array.isArray(payload.roles) ? (payload.roles as string[]) : [];
    } catch {
      throw new UnauthorizedException({ code: "invalid_token" });
    }
    if (!userId || !sessionId) {
      throw new UnauthorizedException({ code: "invalid_token" });
    }

    // Liveness — fail closed (a Redis error must NOT grant access).
    let alive: boolean;
    try {
      alive = await this.tokens.isSessionAlive(sessionId);
    } catch {
      throw new UnauthorizedException({ code: "unauthorized" });
    }
    if (!alive) {
      throw new UnauthorizedException({ code: "session_revoked" });
    }

    req.user = { userId, sessionId, roles };
    return true;
  }
}
