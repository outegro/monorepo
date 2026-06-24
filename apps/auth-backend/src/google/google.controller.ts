import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthService } from "../auth/auth.service";
import { clientContextFrom } from "../common/client-context";
import { type AuthUser, CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { RedisService } from "../redis/redis.service";
import { GoogleService } from "./google.service";

const callbackSchema = z.object({ code: z.string().min(1), state: z.string().min(1) });
const CALLBACK_RESULT_TTL = 120; // seconds — idempotency window for a duplicated callback
type CallbackDto = z.infer<typeof callbackSchema>;

interface RawRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

@Controller("auth/google")
export class GoogleController {
  constructor(
    private readonly google: GoogleService,
    private readonly auth: AuthService,
    private readonly redis: RedisService,
  ) {}

  /** Public: returns the Google consent URL (the BFF redirects the browser there). */
  @Get("start")
  start() {
    return this.google.start();
  }

  /** Authenticated: same, but the resulting identity links to the current account. */
  @Get("link")
  @UseGuards(JwtAuthGuard)
  link(@CurrentUser() user: AuthUser) {
    return this.google.start(user.userId);
  }

  /**
   * Public: the BFF forwards Google's code+state here. Either links to the pending account
   * (link flow) or logs in / signs up (login flow), returning session tokens.
   */
  @Post("callback")
  async callback(
    @Body(new ZodValidationPipe(callbackSchema)) dto: CallbackDto,
    @Req() req: RawRequest,
  ) {
    // OAuth state is single-use, but browsers sometimes fire the redirect callback twice
    // (speculative prefetch / connection retry). The first call atomically burns the state
    // and mints a session; without protection the duplicate hits invalid_state and bounces
    // the already-signed-in user to ?error=google. Cache the first result briefly and
    // replay it for the duplicate so the ceremony is idempotent per state.
    const resultKey = `google:callback:${dto.state}`;
    const cached = await this.redis.get(resultKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const identity = await this.google.exchangeAndVerify(dto.code, dto.state);
    let result: { linked: true } | Awaited<ReturnType<AuthService["findOrLinkGoogleUser"]>>;
    if (identity.linkUserId) {
      await this.auth.linkGoogleIdentity(identity.linkUserId, identity.googleSub, identity.email);
      result = { linked: true };
    } else {
      result = await this.auth.findOrLinkGoogleUser(
        identity.googleSub,
        identity.email,
        identity.emailVerified,
        clientContextFrom(req),
      );
    }
    await this.redis.set(resultKey, JSON.stringify(result), "EX", CALLBACK_RESULT_TTL);
    return result;
  }
}
