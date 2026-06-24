import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { TokensModule } from "../tokens/tokens.module";
import { PasskeysController } from "./passkeys.controller";
import { PasskeysRepository } from "./passkeys.repository";
import { PasskeysService } from "./passkeys.service";

/** AuthModule → AuthService (session) + UsersRepository; TokensModule → JwtAuthGuard deps. */
@Module({
  imports: [AuthModule, TokensModule],
  controllers: [PasskeysController],
  providers: [PasskeysService, PasskeysRepository, JwtAuthGuard],
})
export class PasskeysModule {}
