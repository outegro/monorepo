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

// Quiz grading: client submits the option index it picked per question; the server compares
// against the answer key stored in Redis (the key is never sent to the browser).
export const quizCheckSchema = z.object({
  answers: z.array(z.number().int().min(0)).min(1).max(50),
});
export type QuizCheck = z.infer<typeof quizCheckSchema>;
