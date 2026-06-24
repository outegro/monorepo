import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthService } from "../auth/auth.service";
import { clientContextFrom } from "../common/client-context";
import { type AuthUser, CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { GoogleService } from "./google.service";

const callbackSchema = z.object({ code: z.string().min(1), state: z.string().min(1) });
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
    const identity = await this.google.exchangeAndVerify(dto.code, dto.state);
    if (identity.linkUserId) {
      await this.auth.linkGoogleIdentity(identity.linkUserId, identity.googleSub, identity.email);
      return { linked: true };
    }
    return this.auth.findOrLinkGoogleUser(
      identity.googleSub,
      identity.email,
      identity.emailVerified,
      clientContextFrom(req),
    );
  }
}
