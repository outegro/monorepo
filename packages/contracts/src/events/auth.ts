import { z } from "zod";
import { RoutingKeys } from "../messaging/topology";

export const authUserCreatedDataSchema = z.object({
  userId: z.string().min(1),
  email: z.email(),
  createdAt: z.iso.datetime(),
});
export const authUserCreatedEventSchema = z.object({
  id: z.uuid(),
  type: z.literal(RoutingKeys.AuthUserCreated),
  occurredAt: z.iso.datetime(),
  version: z.number().int().positive(),
  data: authUserCreatedDataSchema,
});
export type AuthUserCreatedEvent = z.infer<typeof authUserCreatedEventSchema>;

export const authSessionTerminatedDataSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
});
export const authSessionTerminatedEventSchema = z.object({
  id: z.uuid(),
  type: z.literal(RoutingKeys.AuthSessionTerminated),
  occurredAt: z.iso.datetime(),
  version: z.number().int().positive(),
  data: authSessionTerminatedDataSchema,
});
export type AuthSessionTerminatedEvent = z.infer<typeof authSessionTerminatedEventSchema>;
