import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis.service";

/** Global: RedisService is injected by the learning module (quiz answer store). */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
