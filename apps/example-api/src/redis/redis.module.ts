import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis.service";

/** Global so any feature can inject the shared Redis connection. */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
