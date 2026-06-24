import { Module } from "@nestjs/common";
import { TokensService } from "./tokens.service";
import { WellKnownController } from "./well-known.controller";

@Module({
  providers: [TokensService],
  controllers: [WellKnownController],
  exports: [TokensService],
})
export class TokensModule {}
