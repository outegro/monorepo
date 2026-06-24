import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Exchanges } from "@outegro/contracts";
import type { Env } from "../config/env.validation";

/**
 * RabbitMQ wiring (publish-only — auth produces events, never consumes). Declares the
 * topic exchanges; the outbox relay publishes to them. `wait: false` lets the pod boot
 * even if the broker is briefly unavailable.
 */
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        uri: config.get("RABBITMQ_URL", { infer: true }),
        exchanges: [
          { name: Exchanges.Notify, type: "topic" },
          { name: Exchanges.Auth, type: "topic" },
        ],
        channels: { default: { default: true } },
        connectionInitOptions: { wait: false },
      }),
    }),
  ],
  exports: [RabbitMQModule],
})
export class MessagingModule {}
