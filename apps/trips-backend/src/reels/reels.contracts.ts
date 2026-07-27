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

/**
 * One reel as entered in the form: its link, and everything the sender knew about it.
 * The note is a whole paragraph, not a trailing fragment — an address, opening hours and a
 * price do not fit after a pipe on one line, and those are exactly the fields that resolve a
 * place. `text` remains for pasting a block of bare links.
 */
export const submitBatchSchema = z
  .object({
    reels: z
      .array(
        z.object({
          url: z.string().min(1).max(500),
          note: z.string().max(4000).optional(),
        }),
      )
      .max(300)
      .optional(),
    /** Fallback: a pasted block, one reel per line, `<url>` or `<url> | <note>`. */
    text: z.string().max(200_000).optional(),
  })
  .refine((v) => (v.reels?.length ?? 0) > 0 || Boolean(v.text?.trim()), {
    message: "nothing to submit",
  });
export type SubmitBatchInput = z.infer<typeof submitBatchSchema>;

export const updateNoteSchema = z.object({ note: z.string().max(2000).nullable() });

/** What the LLM is asked to produce from a note. Every field optional — a bare URL yields {}. */
export const extractionSchema = z.object({
  /** The string we hand to Kakao keyword search. Korean if the note gave a Korean name. */
  query: z.string().max(200).optional(),
  categoryGroup: categoryGroupSchema.optional(),
  /**
   * A street address if the text contains one, verbatim and Korean-formatted
   * ("명동10길 19-3"). Measured on real reels, this is the single strongest signal — but only
   * combined with a category, since one building holds a dozen unrelated businesses.
   */
  address: z.string().max(200).optional(),
  /** Area name, e.g. "성수동", "Hongdae". Tried as one query among several, never alone. */
  district: z.string().max(120).optional(),
  priceHint: z.string().max(200).optional(),
  /**
   * One line of English describing what this place actually is, for the review screen. Kakao
   * answers entirely in Korean — correct for a taxi, useless for deciding at a glance whether
   * this is the all-you-can-eat BBQ you saved or a different one in the same building.
   */
  summary: z.string().max(300).optional(),
  /** Romanised or English name, when the source gives one. The Korean name stays authoritative. */
  nameEn: z.string().max(160).optional(),
  /** Walking time in minutes, if the text states one ("2시간", "약 3시간 코스"). */
  durationMin: z.number().int().min(1).max(2880).optional(),
  /** Length in km, if stated. */
  distanceKm: z.number().min(0).max(500).optional(),
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

/**
 * One stop on a ROUTE. `start` is the only role that matters operationally — it is what the
 * place's own lat/lng mirrors and what navigation targets; `via`/`end` exist so the map can
 * draw the shape and so "where does this finish" is answerable.
 */
export const waypointSchema = z.object({
  name: z.string().min(1).max(120),
  lat: z.number(),
  lng: z.number(),
  role: z.enum(["start", "via", "end"]).default("via"),
});
export type Waypoint = z.infer<typeof waypointSchema>;

export const placeKindSchema = z.enum(["SPOT", "ROUTE"]);
export type PlaceKind = z.infer<typeof placeKindSchema>;

/**
 * Kakao categories that mean "this is a path, not a pin". Matched against the full category
 * string, which is why 등산로 (trail) counts but 산봉우리 (peak) does not — a peak is a
 * destination you reach along a route, not the route itself.
 */
const ROUTE_CATEGORY_HINTS = ["등산로", "둘레길", "산책로", "탐방로", "올레길"];

/** Best-effort guess so the reviewer starts from the right kind instead of flipping it. */
export function guessKind(categoryName: string | null | undefined): PlaceKind {
  return categoryName && ROUTE_CATEGORY_HINTS.some((h) => categoryName.includes(h))
    ? "ROUTE"
    : "SPOT";
}

export const confirmSchema = z.object({
  /** Index into the stored candidate list. */
  candidateIndex: z.number().int().min(0).max(50).optional(),
  /** Or a hand-picked place, for when none of the candidates was right. */
  candidate: candidateSchema.optional(),
  priceNote: z.string().max(200).nullable().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  kind: placeKindSchema.optional(),
  /**
   * For a ROUTE. If one carries role "start", the place's lat/lng is moved onto it — otherwise
   * navigation would aim at whatever Kakao happened to rank first, which for a hike is usually
   * the summit.
   */
  waypoints: z.array(waypointSchema).max(20).optional(),
  durationMin: z.number().int().min(1).max(2880).nullable().optional(),
  distanceKm: z.number().min(0).max(500).nullable().optional(),
});
export type ConfirmInput = z.infer<typeof confirmSchema>;

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  categoryGroup: categoryGroupSchema.optional(),
});

export const updatePlaceSchema = z.object({
  kind: placeKindSchema.optional(),
  waypoints: z.array(waypointSchema).max(20).optional(),
  durationMin: z.number().int().min(1).max(2880).nullable().optional(),
  distanceKm: z.number().min(0).max(500).nullable().optional(),
  priceNote: z.string().max(200).nullable().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
});
