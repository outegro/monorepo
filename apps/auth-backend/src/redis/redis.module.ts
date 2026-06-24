import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis.service";

/** Global: RedisService is injected by tokens, auth, rate-limit, google modules. */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
