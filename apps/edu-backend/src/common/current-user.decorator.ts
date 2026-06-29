import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

/** The authenticated principal, attached to the request by JwtAuthGuard. */
export interface AuthUser {
  userId: string;
  sessionId: string;
  roles: string[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest<{ user: AuthUser }>().user;
  },
);
