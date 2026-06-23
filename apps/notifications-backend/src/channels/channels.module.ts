import { Module } from "@nestjs/common";
import { CHANNEL_ADAPTERS } from "./channel-adapter";
import { EmailAdapter } from "./email.adapter";

/**
 * Registers channel adapters behind the CHANNEL_ADAPTERS multi-provider token.
 * Add a channel (telegram, …) by adding its adapter to providers + the factory —
 * DeliveryService picks it up by `channel` with no edits.
 */
@Module({
  providers: [
    EmailAdapter,
    {
      provide: CHANNEL_ADAPTERS,
      useFactory: (email: EmailAdapter) => [email],
      inject: [EmailAdapter],
    },
  ],
  exports: [CHANNEL_ADAPTERS],
})
export class ChannelsModule {}
