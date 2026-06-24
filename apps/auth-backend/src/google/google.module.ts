import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { TokensModule } from "../tokens/tokens.module";
import { GoogleController } from "./google.controller";
import { GoogleService } from "./google.service";

/** AuthModule → AuthService (link/login); TokensModule → JwtAuthGuard for the link route. */
@Module({
  imports: [AuthModule, TokensModule],
  controllers: [GoogleController],
  providers: [GoogleService, JwtAuthGuard],
})
export class GoogleModule {}
