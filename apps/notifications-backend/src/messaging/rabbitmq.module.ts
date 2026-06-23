import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Exchanges, NotifyTopology } from "@outegro/contracts";
import type { Env } from "../config/env.validation";

/**
 * RabbitMQ wiring (golevelup). Declares the topic exchanges; queues + bindings are
 * declared on the @RabbitSubscribe handlers (so the dead-letter arg lives with the
 * queue it protects). prefetch bounds in-flight messages; `wait: false` lets the pod
 * boot even if the broker is briefly down (subscribers reconnect).
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
          { name: NotifyTopology.deadLetterExchange, type: "topic" },
        ],
        // The DLQ is declared here WITHOUT a consumer: poisoned messages accumulate
        // for inspection/replay, and we alert on its depth (> 0). The consumer already
        // logs the dead-letter reason at nack time, so nothing is lost by not draining it.
        queues: [
          {
            name: NotifyTopology.deadLetterQueue,
            exchange: NotifyTopology.deadLetterExchange,
            routingKey: "#",
            options: { durable: true, arguments: { "x-queue-type": "quorum" } },
          },
        ],
        channels: { default: { prefetchCount: 10, default: true } },
        connectionInitOptions: { wait: false },
        enableControllerDiscovery: true,
      }),
    }),
  ],
  exports: [RabbitMQModule],
})
export class MessagingModule {}
