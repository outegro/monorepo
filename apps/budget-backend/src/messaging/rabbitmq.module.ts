import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Exchanges } from "@outegro/contracts";
import type { Env } from "../config/env.validation";
import { LIVE_EXCHANGE } from "../live/live.constants";

/**
 * RabbitMQ wiring (golevelup). Declares:
 *  - `notify` (topic) — outbound notifications (threshold alerts publish here).
 *  - `budget.live` (fanout) — internal live-sync bus; every replica binds an exclusive
 *    queue on the @RabbitSubscribe handler, so a change fans out to all of them.
 * `wait:false` lets the pod boot even if the broker is briefly down (it reconnects).
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
          { name: LIVE_EXCHANGE, type: "fanout" },
        ],
        channels: { default: { prefetchCount: 20, default: true } },
        connectionInitOptions: { wait: false },
        enableControllerDiscovery: true,
      }),
    }),
  ],
  exports: [RabbitMQModule],
})
export class MessagingModule {}
