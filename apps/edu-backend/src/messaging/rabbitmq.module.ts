import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Exchanges } from "@outegro/contracts";
import type { Env } from "../config/env.validation";

/**
 * RabbitMQ wiring (publish-only — edu emits notification events via the outbox relay).
 * Declares the `notify` topic exchange; `wait:false` lets the pod boot if the broker blips.
 */
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        uri: config.get("RABBITMQ_URL", { infer: true }),
        exchanges: [{ name: Exchanges.Notify, type: "topic" }],
        channels: { default: { default: true } },
        connectionInitOptions: { wait: false },
      }),
    }),
  ],
  exports: [RabbitMQModule],
})
export class MessagingModule {}
