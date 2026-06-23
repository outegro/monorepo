import { Module } from "@nestjs/common";
import { ChannelsModule } from "../channels/channels.module";
import { DeliveryRepository } from "./delivery.repository";
import { DeliveryService } from "./delivery.service";
import { NotifyConsumer } from "./notify.consumer";

@Module({
  imports: [ChannelsModule],
  providers: [NotifyConsumer, DeliveryService, DeliveryRepository],
})
export class NotifyModule {}
