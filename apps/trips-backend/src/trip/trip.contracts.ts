import { z } from "zod";

export const joinTripSchema = z.object({
  inviteCode: z
    .string()
    .min(4)
    .max(16)
    .transform((s) => s.trim().toUpperCase()),
  /** Display name for votes — "Nikita", "Sasha". Beats showing a UUID next to a thumbs-up. */
  label: z.string().max(40).optional(),
});

export const voteSchema = z.object({
  /** 1 = want, -1 = would skip, 0 = clear. Both directions are worth seeing. */
  value: z.number().int().min(-1).max(1),
});

export const attachPlaceSchema = z.object({
  placeId: z.uuid().nullable(),
});
