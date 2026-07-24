import { z } from "zod";

export const loreEntryTypeSchema = z.enum([
  "role",
  "project",
  "achievement",
  "skill",
  "education",
  "note",
]);
export type LoreEntryType = z.infer<typeof loreEntryTypeSchema>;

/** Step 1: freeform brain-dump the user submits. */
export const intakeSchema = z.object({
  text: z.string().min(20).max(20_000),
});
export type IntakeInput = z.infer<typeof intakeSchema>;

/** Step 3: the accepted (possibly edited) text the user confirms for structuring. */
export const structureSchema = z.object({
  text: z.string().min(20).max(20_000),
});
export type StructureInput = z.infer<typeof structureSchema>;

const metricSchema = z.object({ label: z.string(), value: z.string() });

export const updateEntrySchema = z.object({
  type: loreEntryTypeSchema.optional(),
  title: z.string().min(1).max(200).optional(),
  org: z.string().max(200).nullable().optional(),
  startDate: z.string().max(40).nullable().optional(),
  endDate: z.string().max(40).nullable().optional(),
  body: z.string().max(8_000).optional(),
  metrics: z.array(metricSchema).optional(),
  tags: z.array(z.string().max(40)).optional(),
});
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;

export const createEntrySchema = updateEntrySchema.extend({
  type: loreEntryTypeSchema,
  title: z.string().min(1).max(200),
});
export type CreateEntryInput = z.infer<typeof createEntrySchema>;

export const updateProfileSchema = z.object({
  headline: z.string().max(200).nullable().optional(),
  targetRole: z.string().max(200).nullable().optional(),
  locale: z.string().max(8).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ── Shapes the LLM returns (validated defensively; a bad field is dropped, not fatal) ──

export const redFlagSchema = z.object({
  issue: z.string(),
  where: z.string().default(""),
  why: z.string().default(""),
  fix: z.string().default(""),
});
export type RedFlag = z.infer<typeof redFlagSchema>;

export const intakeReviewSchema = z.object({
  improved: z.string(),
  redFlags: z.array(redFlagSchema).default([]),
  summary: z.string().default(""),
});
export type IntakeReview = z.infer<typeof intakeReviewSchema>;

export const structuredEntrySchema = z.object({
  type: loreEntryTypeSchema.catch("note"),
  title: z.string().min(1),
  org: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  body: z.string().default(""),
  metrics: z.array(metricSchema).default([]),
  tags: z.array(z.string()).default([]),
});
export const structureResultSchema = z.object({
  entries: z.array(structuredEntrySchema).default([]),
});
export type StructureResult = z.infer<typeof structureResultSchema>;
