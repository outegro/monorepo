import { z } from "zod";

/**
 * Every cross-service event shares this envelope. `id` is the idempotency key
 * (consumers dedupe on it), `version` lets a payload schema evolve, `data` is the
 * domain-specific body validated by the per-event schema.
 */
export const eventEnvelopeSchema = z.object({
  id: z.uuid(),
  type: z.string().min(1),
  occurredAt: z.iso.datetime(),
  version: z.number().int().positive(),
  data: z.unknown(),
});
export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

/** Build a typed event envelope with a fresh id + timestamp. */
export function makeEvent<TType extends string, TData>(
  type: TType,
  version: number,
  data: TData,
): { id: string; type: TType; occurredAt: string; version: number; data: TData } {
  return {
    id: crypto.randomUUID(),
    type,
    occurredAt: new Date().toISOString(),
    version,
    data,
  };
}
