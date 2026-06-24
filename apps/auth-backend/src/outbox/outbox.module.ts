import { Module } from "@nestjs/common";
import { MessagingModule } from "../messaging/rabbitmq.module";
import { OutboxRelay } from "./outbox.relay";
import { OutboxService } from "./outbox.service";

/** MessagingModule re-exports RabbitMQModule, making AmqpConnection injectable into the relay. */
@Module({
  imports: [MessagingModule],
  providers: [OutboxService, OutboxRelay],
  exports: [OutboxService],
})
export class OutboxModule {}
