import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  NotFoundException,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import { type AuthUser, CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import type { Env } from "../config/env.validation";
import { TelegramService } from "./telegram.service";

const consumeSchema = z.object({ nonce: z.string().min(1) });
type ConsumeDto = z.infer<typeof consumeSchema>;

@Controller()
export class TelegramController {
  constructor(
    private readonly telegram: TelegramService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Authenticated: get a one-time deep-link to connect the user's Telegram. */
  @Post("auth/telegram/link-token")
  @UseGuards(JwtAuthGuard)
  linkToken(@CurrentUser() user: AuthUser) {
    return this.telegram.createLinkToken(user.userId);
  }

  /** Internal (notifications, shared key): resolve a link nonce → userId. */
  @Post("internal/telegram/consume")
  async consume(
    @Body(new ZodValidationPipe(consumeSchema)) dto: ConsumeDto,
    @Headers("x-internal-key") key?: string,
  ): Promise<{ userId: string }> {
    const expected = this.config.get("INTERNAL_API_KEY", { infer: true });
    if (!expected || key !== expected) {
      throw new ForbiddenException({ code: "forbidden" });
    }
    const userId = await this.telegram.consume(dto.nonce);
    if (!userId) {
      throw new NotFoundException({ code: "nonce_invalid" });
    }
    return { userId };
  }
}
