import { Module } from "@nestjs/common";
import { MessagingModule } from "../messaging/rabbitmq.module";
import { LiveConsumer } from "./live.consumer";
import { LiveGateway } from "./live.gateway";
import { LivePublisher } from "./live.publisher";
import { LiveSyncInterceptor } from "./live-sync.interceptor";

/**
 * Live sync: WebSocket gateway (fans "changed" to a user's tabs) + a RabbitMQ fanout bridge
 * so it works across replicas. Exports the interceptor + publisher so feature modules can
 * signal changes.
 */
@Module({
  imports: [MessagingModule],
  providers: [LiveGateway, LivePublisher, LiveConsumer, LiveSyncInterceptor],
  exports: [LiveSyncInterceptor, LivePublisher],
})
export class LiveModule {}
