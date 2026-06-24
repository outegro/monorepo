import { Module } from "@nestjs/common";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { TokensModule } from "../tokens/tokens.module";
import { TelegramController } from "./telegram.controller";
import { TelegramService } from "./telegram.service";

/** Redis is global; TokensModule supplies the JwtAuthGuard deps for the link-token route. */
@Module({
  imports: [TokensModule],
  controllers: [TelegramController],
  providers: [TelegramService, JwtAuthGuard],
})
export class TelegramModule {}
