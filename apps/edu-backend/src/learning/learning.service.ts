import { randomUUID } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { CatalogRepository } from "../catalog/catalog.repository";
import { LlmService } from "../llm/llm.service";
import { NotifyService } from "../notify/notify.service";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import type { VocabAdd } from "./learning.contracts";

interface VocabItem {
  ko: string;
  ru: string;
  romanization?: string;
}
export interface HomeworkFeedback {
  score: number | null;
  corrections: Array<{ wrong: string; right: string; why: string }>;
  feedback: string;
  llm: boolean;
}
export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
}
/** Sent to the browser — same as QuizQuestion but WITHOUT the answer. */
export interface PublicQuizQuestion {
  question: string;
  options: string[];
}
export interface QuizGenerated {
  quizId: string;
  questions: PublicQuizQuestion[];
  llm: boolean;
}
export interface QuizResult {
  score: number;
  total: number;
  results: Array<{ correct: boolean; answerIndex: number }>;
}

const QUIZ_TTL_SECONDS = 1800; // 30 min to finish a generated quiz

/** Learning interactions: AI homework grading, AI Q&A, quiz trainer, personal vocabulary. */
@Injectable()
export class LearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogRepository,
    private readonly llm: LlmService,
    private readonly notify: NotifyService,
    private readonly redis: RedisService,
  ) {}

  private async chapterOrThrow(id: string) {
    const chapter = await this.catalog.chapterById(id);
    if (!chapter) {
      throw new NotFoundException({ code: "chapter_not_found" });
    }
    return chapter;
  }

  /** Grade homework with the LLM, store the attempt, ping the user on Telegram. */
  async checkHomework(
    chapterId: string,
    userId: string,
    answer: string,
  ): Promise<HomeworkFeedback> {
    const chapter = await this.chapterOrThrow(chapterId);
    let result: HomeworkFeedback;

    if (this.llm.enabled) {
      const parsed = await this.llm.chatJson<{
        score?: number;
        corrections?: Array<{ wrong: string; right: string; why: string }>;
        feedback?: string;
      }>(
        [
          {
            role: "system",
            content:
              "Ты — внимательный преподаватель корейского языка. Проверь домашнее задание ученика по уроку. " +
              "Объясни ошибки доброжелательно, но честно. Отвечай на русском. " +
              'Верни ТОЛЬКО JSON: {"score": <целое 0-100>, "corrections": [{"wrong":"...","right":"...","why":"..."}], "feedback":"<2-4 предложения>"}.',
          },
          {
            role: "user",
            content:
              `Урок: ${chapter.title}\n\nМатериал урока:\n${chapter.material}\n\n` +
              `Задание: ${chapter.homeworkPrompt ?? "(свободный ответ по теме урока)"}\n\n` +
              `Ответ ученика:\n${answer}`,
          },
        ],
        { operation: "homework" },
      );
      result = {
        score: typeof parsed?.score === "number" ? parsed.score : null,
        corrections: Array.isArray(parsed?.corrections) ? parsed.corrections : [],
        feedback: parsed?.feedback ?? "Спасибо! Ответ получен.",
        llm: true,
      };
    } else {
      result = {
        score: null,
        corrections: [],
        feedback: "Ответ сохранён. AI-проверка появится, когда будет подключён ключ модели.",
        llm: false,
      };
    }

    await this.prisma.homeworkSubmission.create({
      data: {
        userId,
        chapterId,
        answer,
        score: result.score,
        feedback: result as unknown as object,
      },
    });

    // Best-effort Telegram nudge (skipped silently if the user hasn't linked Telegram).
    void this.notify
      .notifyUser(
        userId,
        "Домашка проверена",
        `«${chapter.title}»: ${result.score !== null ? `оценка ${result.score}/100. ` : ""}${result.feedback}`,
      )
      .catch(() => undefined);

    return result;
  }

  /** Answer a free-form question about the chapter. */
  async ask(chapterId: string, question: string): Promise<{ answer: string; llm: boolean }> {
    const chapter = await this.chapterOrThrow(chapterId);
    if (!this.llm.enabled) {
      return { answer: "AI-ассистент появится, когда будет подключён ключ модели.", llm: false };
    }
    const answer = await this.llm.chat(
      [
        {
          role: "system",
          content:
            "Ты — помощник-преподаватель корейского. Кратко и понятно ответь на вопрос ученика " +
            "по этому уроку на русском, при необходимости приводя примеры на корейском.",
        },
        {
          role: "user",
          content: `Урок: ${chapter.title}\n\nМатериал:\n${chapter.material}\n\nВопрос: ${question}`,
        },
      ],
      { operation: "ask", maxTokens: 1500 },
    );
    return { answer, llm: true };
  }

  /**
   * Generate a fresh practice quiz. Answers are stored in Redis (`edu:quiz:<id>`) and stripped
   * from the response so the browser can't read the correct option — grading happens in checkQuiz.
   * Falls back to a vocab-derived quiz without the LLM.
   */
  async quiz(chapterId: string): Promise<QuizGenerated> {
    const chapter = await this.chapterOrThrow(chapterId);
    const vocab = (chapter.vocab as unknown as VocabItem[]) ?? [];

    let questions: QuizQuestion[] = [];
    let llm = false;
    if (this.llm.enabled) {
      const parsed = await this.llm.chatJson<{ questions?: QuizQuestion[] }>(
        [
          {
            role: "system",
            content:
              "Сгенерируй 5 разных тестовых вопросов с выбором ответа для тренировки лексики этого урока корейского. " +
              "Каждый раз делай новый вариант. Верни ТОЛЬКО JSON: " +
              '{"questions":[{"question":"...","options":["...","...","...","..."],"answerIndex":<0-3>}]}.',
          },
          {
            role: "user",
            content: `Урок: ${chapter.title}\nСлова: ${JSON.stringify(vocab)}\nМатериал:\n${chapter.material}`,
          },
        ],
        { operation: "quiz", maxTokens: 2500 },
      );
      questions = (parsed?.questions ?? []).filter(
        (q) =>
          q &&
          Array.isArray(q.options) &&
          q.options.length >= 2 &&
          Number.isInteger(q.answerIndex) &&
          q.answerIndex >= 0 &&
          q.answerIndex < q.options.length,
      );
      llm = questions.length > 0;
    }
    if (questions.length === 0) {
      questions = this.vocabQuiz(vocab);
    }

    const quizId = randomUUID();
    // Persist the full questions (with answers) server-side, keyed by quizId.
    await this.redis.set(
      `edu:quiz:${quizId}`,
      JSON.stringify({ chapterId, questions }),
      "EX",
      QUIZ_TTL_SECONDS,
    );
    return {
      quizId,
      questions: questions.map((q) => ({ question: q.question, options: q.options })),
      llm,
    };
  }

  /** Grade a submitted quiz against the answer key stored in Redis. */
  async checkQuiz(quizId: string, answers: number[]): Promise<QuizResult> {
    const raw = await this.redis.get(`edu:quiz:${quizId}`);
    if (!raw) {
      throw new NotFoundException({ code: "quiz_expired" });
    }
    const { questions } = JSON.parse(raw) as { questions: QuizQuestion[] };
    const results = questions.map((q, i) => ({
      answerIndex: q.answerIndex,
      correct: answers[i] === q.answerIndex,
    }));
    return { score: results.filter((r) => r.correct).length, total: questions.length, results };
  }

  /** Deterministic-but-shuffled quiz from the chapter's built-in vocabulary. */
  private vocabQuiz(vocab: VocabItem[]): QuizQuestion[] {
    if (vocab.length < 2) {
      return [];
    }
    const shuffled = [...vocab].sort(() => Math.random() - 0.5).slice(0, 5);
    return shuffled.map((item) => {
      const distractors = vocab
        .filter((v) => v.ru !== item.ru)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((v) => v.ru);
      const options = [item.ru, ...distractors].sort(() => Math.random() - 0.5);
      return {
        question: `Что означает «${item.ko}»?`,
        options,
        answerIndex: options.indexOf(item.ru),
      };
    });
  }

  // ── personal vocabulary (Quizlet-like) ──
  listVocab(userId: string) {
    return this.prisma.vocabEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async addVocab(userId: string, item: VocabAdd) {
    return this.prisma.vocabEntry.upsert({
      where: { vocab_user_ko_uq: { userId, ko: item.ko } },
      create: {
        userId,
        ko: item.ko,
        ru: item.ru,
        romanization: item.romanization ?? null,
        chapterId: item.chapterId ?? null,
      },
      update: { ru: item.ru, romanization: item.romanization ?? null },
    });
  }

  /** Bulk-add a chapter's built-in vocabulary to the user's list. */
  async addChapterVocab(chapterId: string, userId: string) {
    const chapter = await this.chapterOrThrow(chapterId);
    const vocab = (chapter.vocab as unknown as VocabItem[]) ?? [];
    for (const item of vocab) {
      await this.addVocab(userId, { ...item, chapterId });
    }
    return { added: vocab.length };
  }

  async removeVocab(userId: string, id: string) {
    await this.prisma.vocabEntry.deleteMany({ where: { id, userId } });
    return { deleted: true };
  }
}
