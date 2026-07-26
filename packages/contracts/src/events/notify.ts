import { z } from "zod";
import { RoutingKeys } from "../messaging/topology";

export const notificationChannelSchema = z.enum(["email", "telegram"]);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

/**
 * `service_notice` is the platform's generic subservice notice ({ title, message }) — any
 * subservice reuses it instead of adding its own template. It was called `edu_notice` while
 * edu existed; renamed when edu was removed, since nothing about it was edu-specific.
 */
export const notifyTemplateSchema = z.enum(["login_code", "security_alert", "service_notice"]);
export type NotifyTemplate = z.infer<typeof notifyTemplateSchema>;

export const localeSchema = z.enum(["ru", "en"]);
export type Locale = z.infer<typeof localeSchema>;

/**
 * Mandatory templates (transactional / security) ignore user preferences — they
 * are always delivered on the requested channels.
 */
const MANDATORY_TEMPLATES = new Set<NotifyTemplate>(["login_code", "security_alert"]);
export function isMandatory(template: NotifyTemplate): boolean {
  return MANDATORY_TEMPLATES.has(template);
}

export const notifyTargetSchema = z.object({
  email: z.email().optional(),
  telegramChatId: z.string().optional(),
});
export type NotifyTarget = z.infer<typeof notifyTargetSchema>;

export const notifyRequestedDataSchema = z.object({
  userId: z.string().min(1),
  template: notifyTemplateSchema,
  channels: z.array(notificationChannelSchema).min(1),
  to: notifyTargetSchema,
  locale: localeSchema.default("ru"),
  /** Template variables (e.g. `{ code }` for login_code, `{ message }` for security_alert). */
  data: z.record(z.string(), z.unknown()).default({}),
});
export type NotifyRequestedData = z.infer<typeof notifyRequestedDataSchema>;

export const notifyRequestedEventSchema = z.object({
  id: z.uuid(),
  type: z.literal(RoutingKeys.NotifyRequested),
  occurredAt: z.iso.datetime(),
  version: z.number().int().positive(),
  data: notifyRequestedDataSchema,
});
export type NotifyRequestedEvent = z.infer<typeof notifyRequestedEventSchema>;
