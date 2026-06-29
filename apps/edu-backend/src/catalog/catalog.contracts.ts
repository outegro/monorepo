import { z } from "zod";

export const vocabItemSchema = z.object({
  ko: z.string().min(1),
  ru: z.string().min(1),
  romanization: z.string().optional(),
});

export const mockTestItemSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  answerIndex: z.number().int().min(0),
});

export const courseUpsertSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  description: z.string().optional(),
  level: z.string().optional(),
  sortOrder: z.number().int().default(0),
  published: z.boolean().default(true),
});
export type CourseUpsert = z.infer<typeof courseUpsertSchema>;

export const chapterUpsertSchema = z.object({
  index: z.number().int().min(1),
  title: z.string().min(1),
  material: z.string().min(1),
  vocab: z.array(vocabItemSchema).default([]),
  mockTest: z.array(mockTestItemSchema).default([]),
  homeworkPrompt: z.string().optional(),
  recordingUrl: z.string().optional(),
  published: z.boolean().default(true),
});
export type ChapterUpsert = z.infer<typeof chapterUpsertSchema>;

export const chapterPatchSchema = chapterUpsertSchema.partial();
export type ChapterPatch = z.infer<typeof chapterPatchSchema>;
