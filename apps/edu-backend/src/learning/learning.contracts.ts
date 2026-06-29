import { z } from "zod";

export const homeworkSubmitSchema = z.object({ answer: z.string().min(1).max(8000) });
export type HomeworkSubmit = z.infer<typeof homeworkSubmitSchema>;

export const askSchema = z.object({ question: z.string().min(1).max(2000) });
export type Ask = z.infer<typeof askSchema>;

export const vocabAddSchema = z.object({
  ko: z.string().min(1),
  ru: z.string().min(1),
  romanization: z.string().optional(),
  chapterId: z.string().uuid().optional(),
});
export type VocabAdd = z.infer<typeof vocabAddSchema>;
