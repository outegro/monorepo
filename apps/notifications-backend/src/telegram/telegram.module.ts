import { Module } from "@nestjs/common";
import { TelegramController } from "./telegram.controller";
import { TelegramService } from "./telegram.service";
import { TelegramApi } from "./telegram-api.service";
import { TelegramLinksRepository } from "./telegram-links.repository";

/** Exports TelegramApi so the Telegram channel adapter (ChannelsModule) can send. */
@Module({
  controllers: [TelegramController],
  providers: [TelegramApi, TelegramService, TelegramLinksRepository],
  exports: [TelegramApi],
})
export class TelegramModule {}
