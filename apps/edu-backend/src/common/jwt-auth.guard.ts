import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";
import type { Env } from "../config/env.validation";
import type { AuthUser } from "./current-user.decorator";

/**
 * Subservice auth: verify the Bearer access token against auth-backend's JWKS (signature
 * + iss/aud) fetched in-cluster. Stateless (JWKS-only) — no Redis; liveness/revocation is
 * the BFF's job and bounded by the short access TTL. The verified principal (userId, sid,
 * roles) is attached to the request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwks: JWTVerifyGetKey;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.jwks = createRemoteJWKSet(new URL(config.get("JWKS_URL", { infer: true })));
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user?: AuthUser }>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException({ code: "unauthorized" });
    }
    try {
      const { payload } = await jwtVerify(header.slice(7), this.jwks, {
        issuer: this.config.get("JWT_ISSUER", { infer: true }),
        audience: this.config.get("JWT_AUDIENCE", { infer: true }),
      });
      const userId = String(payload.sub ?? "");
      const sessionId = String(payload.sid ?? "");
      if (!userId || !sessionId) {
        throw new Error("missing claims");
      }
      req.user = {
        userId,
        sessionId,
        roles: Array.isArray(payload.roles) ? (payload.roles as string[]) : [],
      };
      return true;
    } catch {
      throw new UnauthorizedException({ code: "invalid_token" });
    }
  }
}
