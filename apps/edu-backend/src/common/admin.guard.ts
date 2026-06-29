import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation";
import type { AuthUser } from "./current-user.decorator";

/**
 * Admin gate for catalog editing. Runs AFTER JwtAuthGuard (which attaches `req.user`) and
 * requires one of ADMIN_ROLES (e.g. `edu:admin` or `outegro:admin`) in the token's roles.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminRoles: string[];

  constructor(config: ConfigService<Env, true>) {
    this.adminRoles = config
      .get("ADMIN_ROLES", { infer: true })
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
  }

  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    const roles = user?.roles ?? [];
    if (!this.adminRoles.some((r) => roles.includes(r))) {
      throw new ForbiddenException({ code: "admin_required" });
    }
    return true;
  }
}
