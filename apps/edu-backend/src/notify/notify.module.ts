import { Module } from "@nestjs/common";
import { MessagingModule } from "../messaging/rabbitmq.module";
import { NotifyService } from "./notify.service";
import { OutboxRelay } from "./outbox.relay";
import { OutboxService } from "./outbox.service";

/** Outbox writer + polling relay (publishes to RabbitMQ) + the edu notification helper. */
@Module({
  imports: [MessagingModule],
  providers: [OutboxService, OutboxRelay, NotifyService],
  exports: [NotifyService],
})
export class NotifyModule {}
