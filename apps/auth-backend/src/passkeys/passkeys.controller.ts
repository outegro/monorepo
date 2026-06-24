import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { AuthService } from "../auth/auth.service";
import { clientContextFrom } from "../common/client-context";
import { type AuthUser, CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import {
  type AuthenticationVerifyDto,
  authenticationVerifySchema,
  type RegistrationVerifyDto,
  registrationVerifySchema,
} from "./passkeys.contracts";
import { PasskeysService } from "./passkeys.service";

interface RawRequest {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

@Controller("auth/passkeys")
export class PasskeysController {
  constructor(
    private readonly passkeys: PasskeysService,
    private readonly auth: AuthService,
  ) {}

  // --- Registration (authenticated: add a passkey to the current account) ---

  @Post("registration/options")
  @UseGuards(JwtAuthGuard)
  registrationOptions(@CurrentUser() user: AuthUser) {
    return this.passkeys.registrationOptions(user.userId);
  }

  @Post("registration/verify")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async registrationVerify(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(registrationVerifySchema)) dto: RegistrationVerifyDto,
  ): Promise<void> {
    await this.passkeys.verifyRegistration(
      user.userId,
      dto.response as unknown as RegistrationResponseJSON,
      dto.name,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthUser) {
    return this.passkeys.list(user.userId);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.passkeys.deletePasskey(user.userId, id);
  }

  // --- Authentication (public: sign in with a passkey, no password) ---

  @Post("authentication/options")
  authenticationOptions() {
    return this.passkeys.authenticationOptions();
  }

  @Post("authentication/verify")
  async authenticationVerify(
    @Body(new ZodValidationPipe(authenticationVerifySchema)) dto: AuthenticationVerifyDto,
    @Req() req: RawRequest,
  ) {
    const userId = await this.passkeys.verifyAuthentication(
      dto.challengeId,
      dto.response as unknown as AuthenticationResponseJSON,
    );
    return this.auth.issueSessionForUser(userId, "passkey", clientContextFrom(req));
  }
}
