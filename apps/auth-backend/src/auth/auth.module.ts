import { Module } from "@nestjs/common";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { OutboxModule } from "../outbox/outbox.module";
import { RateLimitModule } from "../rate-limit/rate-limit.module";
import { TokensModule } from "../tokens/tokens.module";
import { UsersRepository } from "../users/users.repository";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EntitlementsService } from "./entitlements.service";
import { LoginCodesRepository } from "./login-codes.repository";
import { SessionsService } from "./sessions.service";

/** Email-code login, sessions, entitlements. Redis/Prisma are global; AMQP via MessagingModule. */
@Module({
  imports: [TokensModule, RateLimitModule, OutboxModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersRepository,
    LoginCodesRepository,
    SessionsService,
    EntitlementsService,
    JwtAuthGuard,
  ],
  exports: [AuthService, UsersRepository],
})
export class AuthModule {}
