import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { ClientContext } from "../common/client-context";
import { type AuthUser, CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { RateLimitService } from "../rate-limit/rate-limit.service";
import {
  type LogoutDto,
  logoutSchema,
  type RefreshDto,
  type RequestCodeDto,
  refreshSchema,
  requestCodeSchema,
  type VerifyCodeDto,
  verifyCodeSchema,
} from "./auth.contracts";
import { AuthService } from "./auth.service";

interface RawRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post("request")
  @HttpCode(HttpStatus.ACCEPTED)
  async request(
    @Body(new ZodValidationPipe(requestCodeSchema)) dto: RequestCodeDto,
    @Req() req: RawRequest,
  ): Promise<{ status: "sent" }> {
    const ip = this.clientIp(req);
    // Per-email (slow) AND per-IP (broad) — either tripping blocks the request.
    await this.limit("request:email", dto.email, 5, 3600);
    await this.limit("request:ip", ip, 30, 3600);
    await this.auth.requestCode(dto.email);
    return { status: "sent" };
  }

  @Post("verify")
  async verify(
    @Body(new ZodValidationPipe(verifyCodeSchema)) dto: VerifyCodeDto,
    @Req() req: RawRequest,
  ) {
    await this.limit("verify:ip", this.clientIp(req), 30, 3600);
    return this.auth.verifyCode(dto.email, dto.code, this.clientContext(req));
  }

  @Post("refresh")
  refresh(@Body(new ZodValidationPipe(refreshSchema)) dto: RefreshDto, @Req() req: RawRequest) {
    return this.auth.refresh(dto.refreshToken, this.clientContext(req));
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body(new ZodValidationPipe(logoutSchema)) dto: LogoutDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.userId);
  }

  @Get("sessions")
  @UseGuards(JwtAuthGuard)
  sessions(@CurrentUser() user: AuthUser) {
    return this.auth.listSessions(user.userId, user.sessionId);
  }

  @Delete("sessions/:id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async terminateSession(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.auth.terminateSession(user.userId, id);
  }

  @Post("sessions/revoke-others")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeOthers(@CurrentUser() user: AuthUser): Promise<void> {
    await this.auth.terminateOtherSessions(user.userId, user.sessionId);
  }

  @Get("entitlements")
  @UseGuards(JwtAuthGuard)
  entitlements(@CurrentUser() user: AuthUser) {
    return this.auth.getEntitlements(user.userId);
  }

  @Get("identities")
  @UseGuards(JwtAuthGuard)
  identities(@CurrentUser() user: AuthUser) {
    return this.auth.getIdentities(user.userId);
  }

  private async limit(action: string, id: string, max: number, windowSec: number): Promise<void> {
    const { allowed, retryAfter } = await this.rateLimit.hit(action, id, max, windowSec);
    if (!allowed) {
      throw new HttpException({ code: "rate_limited", retryAfter }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private clientIp(req: RawRequest): string {
    const cf = req.headers["cf-connecting-ip"];
    if (typeof cf === "string" && cf.length > 0) {
      return cf;
    }
    return req.ip ?? "unknown";
  }

  private clientContext(req: RawRequest): ClientContext {
    const header = (name: string): string | undefined => {
      const v = req.headers[name];
      return typeof v === "string" && v.length > 0 ? v : undefined;
    };
    return {
      userAgent: header("user-agent"),
      ip: this.clientIp(req),
      country: header("cf-ipcountry"),
      city: header("cf-ipcity"),
    };
  }
}
