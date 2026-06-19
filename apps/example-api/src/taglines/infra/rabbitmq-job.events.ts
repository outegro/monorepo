import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Injectable } from "@nestjs/common";
import { EVENTS_EXCHANGE, TaglineRoutingKey } from "../../messaging/messaging.constants";
import type { JobEvents } from "../domain/ports";

/** Publishes `tagline.requested` to the topic exchange (persistent). */
@Injectable()
export class RabbitJobEvents implements JobEvents {
  constructor(private readonly amqp: AmqpConnection) {}

  async publishRequested(event: { jobId: string; prompt: string }): Promise<void> {
    await this.amqp.publish(EVENTS_EXCHANGE, TaglineRoutingKey.Requested, event, {
      persistent: true,
    });
  }
}
