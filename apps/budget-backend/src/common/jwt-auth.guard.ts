import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { AuthUser } from "./current-user.decorator";
import { TokenVerifierService } from "./token-verifier.service";

/**
 * Subservice auth: verify the Bearer access token against auth-backend's JWKS (signature
 * + iss/aud). Stateless (JWKS-only) — no Redis; liveness/revocation is the BFF's job and
 * bounded by the short access TTL. The verified principal (userId, sid, roles) is attached
 * to the request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly verifier: TokenVerifierService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user?: AuthUser }>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException({ code: "unauthorized" });
    }
    const user = await this.verifier.verify(header.slice(7));
    if (!user) {
      throw new UnauthorizedException({ code: "invalid_token" });
    }
    req.user = user;
    return true;
  }
}
