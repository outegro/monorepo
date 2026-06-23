import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import type { Env } from "../config/env.validation";
import type { RenderedMessage } from "../emails/render";
import type {
  ChannelSendResult,
  DeliveryTarget,
  NotificationChannelAdapter,
} from "./channel-adapter";

/**
 * Email channel via Resend. Without RESEND_API_KEY (dev/setup gap) it logs the
 * message instead of sending, so login codes stay usable locally.
 */
@Injectable()
export class EmailAdapter implements NotificationChannelAdapter {
  readonly channel = "email" as const;
  private readonly logger = new Logger(EmailAdapter.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(config: ConfigService<Env, true>) {
    const key = config.get("RESEND_API_KEY", { infer: true });
    this.resend = key ? new Resend(key) : null;
    this.from = config.get("RESEND_FROM", { infer: true });
  }

  canDeliver(target: DeliveryTarget): boolean {
    return Boolean(target.email);
  }

  async send(target: DeliveryTarget, message: RenderedMessage): Promise<ChannelSendResult> {
    if (!target.email) {
      throw new Error("email target missing");
    }
    if (!this.resend) {
      this.logger.warn(`DEV email (no RESEND_API_KEY) → ${target.email}: ${message.subject}`);
      return { providerMessageId: "dev" };
    }
    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: target.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (error) {
      throw new Error(`resend: ${error.message}`);
    }
    return { providerMessageId: data?.id };
  }
}
