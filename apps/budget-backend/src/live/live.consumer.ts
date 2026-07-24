import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Injectable } from "@nestjs/common";
import { LIVE_EXCHANGE, type LiveChangedMessage } from "./live.constants";
import { LiveGateway } from "./live.gateway";

/**
 * Bridges the `budget.live` fanout back to local sockets. The empty `queue` name + exclusive
 * option makes RabbitMQ mint a per-connection server-named queue, so EVERY replica gets every
 * message (fanout) rather than round-robin. The replica(s) holding the user's socket re-emit;
 * the rest hit an empty room and no-op. That's the cross-replica correctness for live sync.
 */
@Injectable()
export class LiveConsumer {
  constructor(private readonly gateway: LiveGateway) {}

  @RabbitSubscribe({
    exchange: LIVE_EXCHANGE,
    routingKey: "",
    queue: "",
    queueOptions: { exclusive: true, autoDelete: true, durable: false },
  })
  handle(msg: LiveChangedMessage): void {
    if (msg?.userId) {
      this.gateway.emitChanged(msg.userId);
    }
  }
}
