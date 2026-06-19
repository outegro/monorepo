import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.validation";
import { EVENTS_EXCHANGE } from "./messaging.constants";

/**
 * RabbitMQ wiring. Global so publishers/consumers anywhere can inject
 * `AmqpConnection` / register `@RabbitSubscribe` handlers.
 *
 * `connectionInitOptions.wait=false` → app boots even if the broker is briefly
 * down; readiness (`/health/deep`) gates traffic until it reconnects.
 */
@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        uri: config.get("RABBITMQ_URL", { infer: true }),
        exchanges: [{ name: EVENTS_EXCHANGE, type: "topic" }],
        connectionInitOptions: { wait: false },
        enableControllerDiscovery: true,
      }),
    }),
  ],
  exports: [RabbitMQModule],
})
export class MessagingModule {}
