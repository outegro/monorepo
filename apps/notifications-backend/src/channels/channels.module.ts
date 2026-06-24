import { Module } from "@nestjs/common";
import { TelegramModule } from "../telegram/telegram.module";
import { CHANNEL_ADAPTERS } from "./channel-adapter";
import { EmailAdapter } from "./email.adapter";
import { TelegramAdapter } from "./telegram.adapter";

/**
 * Registers channel adapters behind the CHANNEL_ADAPTERS multi-provider token.
 * Add a channel by adding its adapter to providers + the factory — DeliveryService
 * picks it up by `channel` with no edits. TelegramModule supplies TelegramApi.
 */
@Module({
  imports: [TelegramModule],
  providers: [
    EmailAdapter,
    TelegramAdapter,
    {
      provide: CHANNEL_ADAPTERS,
      useFactory: (email: EmailAdapter, telegram: TelegramAdapter) => [email, telegram],
      inject: [EmailAdapter, TelegramAdapter],
    },
  ],
  exports: [CHANNEL_ADAPTERS],
})
export class ChannelsModule {}
