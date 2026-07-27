import { z } from "zod";

/**
 * Kakao Local category group codes, restricted to the ones this catalogue cares about.
 * Kakao publishes more (banks, parking, …); a trip catalogue only ever wants these five,
 * and constraining the enum keeps the LLM from inventing codes.
 */
export const CATEGORY_GROUPS = {
  FD6: "Food",
  CE7: "Cafe",
  AT4: "Attraction",
  CT1: "Culture",
  AD5: "Accommodation",
} as const;

export const categoryGroupSchema = z.enum(["FD6", "CE7", "AT4", "CT1", "AD5"]);
export type CategoryGroup = z.infer<typeof categoryGroupSchema>;

/**
 * Instagram reel/post shortcode out of a URL. Accepts /reel/, /reels/, /p/ and /tv/ —
 * Instagram serves the same content under all of them and people paste whichever they got.
 * Returns null for anything that is not an Instagram permalink, which the caller turns into
 * a per-line error rather than rejecting the whole batch.
 */
export function parseShortcode(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)instagram\.com$/.test(url.hostname)) return null;
  const m = url.pathname.match(/^\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  return m?.[1] ?? null;
}

/**
 * One pasted line. The whole point of the batch box is that 100+ reels go in as one paste,
 * so the format has to survive whatever the phone clipboard produced: a bare URL, or a URL
 * followed by a note after `|`, `—`, `-` or a tab.
 */
export function parseBatchLine(line: string): { url: string; note?: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(\S+)(?:\s*(?:\||—|–|\t|\s-\s)\s*(.*))?$/);
  const url = m?.[1];
  if (!url) return null;
  const note = m?.[2]?.trim();
  return { url, note: note ? note : undefined };
}

export const submitBatchSchema = z.object({
  /** Raw textarea contents — one reel per line, `<url>` or `<url> | <note>`. */
  text: z.string().min(1).max(200_000),
});
export type SubmitBatchInput = z.infer<typeof submitBatchSchema>;

export const updateNoteSchema = z.object({ note: z.string().max(2000).nullable() });

/** What the LLM is asked to produce from a note. Every field optional — a bare URL yields {}. */
export const extractionSchema = z.object({
  /** The string we hand to Kakao keyword search. Korean if the note gave a Korean name. */
  query: z.string().max(200).optional(),
  categoryGroup: categoryGroupSchema.optional(),
  /** Seoul district or area, e.g. "성수동", "Hongdae" — narrows the Kakao search. */
  district: z.string().max(120).optional(),
  priceHint: z.string().max(200).optional(),
  keywords: z.array(z.string().max(60)).max(10).optional(),
});
export type Extraction = z.infer<typeof extractionSchema>;

/** A Kakao Local hit, trimmed to what the reviewer actually needs to decide. */
export const candidateSchema = z.object({
  kakaoId: z.string(),
  name: z.string(),
  categoryGroup: z.string().nullable(),
  categoryName: z.string().nullable(),
  address: z.string().nullable(),
  roadAddress: z.string().nullable(),
  phone: z.string().nullable(),
  kakaoUrl: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
});
export type Candidate = z.infer<typeof candidateSchema>;

export const confirmSchema = z.object({
  /** Index into the stored candidate list. */
  candidateIndex: z.number().int().min(0).max(50).optional(),
  /** Or a hand-picked place, for when none of the candidates was right. */
  candidate: candidateSchema.optional(),
  priceNote: z.string().max(200).nullable().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  day: z.number().int().min(1).max(60).nullable().optional(),
});
export type ConfirmInput = z.infer<typeof confirmSchema>;

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  categoryGroup: categoryGroupSchema.optional(),
});

export const updatePlaceSchema = z.object({
  day: z.number().int().min(1).max(60).nullable().optional(),
  orderInDay: z.number().int().min(0).max(500).nullable().optional(),
  priceNote: z.string().max(200).nullable().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
});
