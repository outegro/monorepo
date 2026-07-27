import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";
import type { Env } from "../config/env.validation";
import type { AuthUser } from "./current-user.decorator";

/**
 * Shared access-token verification: signature (against auth-backend's JWKS, fetched
 * in-cluster) + iss/aud, returning the principal (userId, sid, roles) or null. Used by
 * both the HTTP guard and the WebSocket gateway so they agree on exactly what "valid" means.
 */
@Injectable()
export class TokenVerifierService {
  private readonly jwks: JWTVerifyGetKey;

  constructor(private readonly config: ConfigService<Env, true>) {
    this.jwks = createRemoteJWKSet(new URL(config.get("JWKS_URL", { infer: true })));
  }

  async verify(token: string): Promise<AuthUser | null> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.config.get("JWT_ISSUER", { infer: true }),
        audience: this.config.get("JWT_AUDIENCE", { infer: true }),
      });
      const userId = String(payload.sub ?? "");
      const sessionId = String(payload.sid ?? "");
      if (!userId || !sessionId) {
        return null;
      }
      return {
        userId,
        sessionId,
        roles: Array.isArray(payload.roles) ? (payload.roles as string[]) : [],
      };
    } catch {
      return null;
    }
  }
}
