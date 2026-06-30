"use client";

import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";
import { Shell } from "@/components/shell";
import { Button, Card } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

interface VocabItem {
  ko: string;
  ru: string;
  romanization?: string;
}
interface MockQ {
  question: string;
  options: string[];
  answerIndex: number;
}
interface Chapter {
  id: string;
  title: string;
  material: string;
  vocab: VocabItem[];
  mockTest: MockQ[];
  homeworkPrompt: string | null;
}
interface Feedback {
  score: number | null;
  corrections: Array<{ wrong: string; right: string; why: string }>;
  feedback: string;
  llm: boolean;
}

export default function ChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Shell>{() => <ChapterView id={id} />}</Shell>;
}

function ChapterView({ id }: { id: string }) {
  const { t } = useI18n();
  const [ch, setCh] = useState<Chapter | null>(null);
  useEffect(() => {
    fetch(`/api/edu/chapters/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setCh)
      .catch(() => setCh(null));
  }, [id]);

  if (!ch) return <p className="text-muted-foreground text-sm">{t("common.loading")}</p>;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-semibold text-2xl tracking-tight">{ch.title}</h1>

      <Card>
        <h2 className="mb-2 font-medium">{t("chapter.material")}</h2>
        <Markdown text={ch.material} />
      </Card>

      <VocabBlock chapterId={id} vocab={ch.vocab} />
      {ch.mockTest.length > 0 ? <MockTest questions={ch.mockTest} /> : null}
      <Quiz chapterId={id} />
      <Homework chapterId={id} prompt={ch.homeworkPrompt} />
      <AskAi chapterId={id} />

      <CompleteButton chapterId={id} />
    </div>
  );
}

function VocabBlock({ chapterId, vocab }: { chapterId: string; vocab: VocabItem[] }) {
  const { t } = useI18n();
  if (vocab.length === 0) return null;
  async function addAll() {
    const r = await fetch(`/api/edu/chapters/${chapterId}/vocab`, {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    toast[r.ok ? "success" : "error"](t(r.ok ? "chapter.vocab.added" : "chapter.vocab.addErr"));
  }
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">{t("chapter.vocab")}</h2>
        <Button size="sm" variant="outline" onClick={addAll}>
          {t("chapter.vocab.add")}
        </Button>
      </div>
      <ul className="flex flex-col divide-y divide-border/60">
        {vocab.map((v) => (
          <li key={v.ko} className="flex items-center justify-between py-2 text-sm">
            <span className="font-medium">{v.ko}</span>
            <span className="text-muted-foreground">
              {v.romanization ? `${v.romanization} · ` : ""}
              {v.ru}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function MockTest({ questions }: { questions: MockQ[] }) {
  const { t } = useI18n();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const correct = questions.filter((q, i) => answers[i] === q.answerIndex).length;
  return (
    <Card>
      <h2 className="mb-3 font-medium">{t("chapter.mock")}</h2>
      <div className="flex flex-col gap-4">
        {questions.map((q, qi) => (
          <div key={q.question}>
            <p className="mb-1.5 text-sm">{q.question}</p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt, oi) => {
                const picked = answers[qi] === oi;
                const isAnswer = q.answerIndex === oi;
                const cls = checked
                  ? isAnswer
                    ? "border-green-500 text-green-600"
                    : picked
                      ? "border-red-500 text-red-600"
                      : "border-border"
                  : picked
                    ? "border-foreground"
                    : "border-border";
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => !checked && setAnswers((a) => ({ ...a, [qi]: oi }))}
                    className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent ${cls}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {checked ? (
        <p className="mt-3 text-sm">
          {t("chapter.result")}: <span className="font-semibold">{correct}</span> /{" "}
          {questions.length}
        </p>
      ) : (
        <Button className="mt-3" size="sm" onClick={() => setChecked(true)}>
          {t("chapter.check")}
        </Button>
      )}
    </Card>
  );
}

interface QuizQ {
  question: string;
  options: string[];
}
interface QuizResult {
  score: number;
  total: number;
  results: Array<{ correct: boolean; answerIndex: number }>;
}

/**
 * Generated trainer. The server returns questions WITHOUT the correct answers (those live in
 * Redis) and grades the submission — so the right options can't be read from the payload.
 */
function Quiz({ chapterId }: { chapterId: string }) {
  const { t } = useI18n();
  const [quiz, setQuiz] = useState<{ quizId: string; questions: QuizQ[] } | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  async function gen() {
    setBusy(true);
    setResult(null);
    setAnswers({});
    const r = await fetch(`/api/edu/chapters/${chapterId}/quiz`);
    setBusy(false);
    if (r.ok) {
      const data = await r.json();
      setQuiz({ quizId: data.quizId, questions: data.questions ?? [] });
    } else {
      toast.error(t("chapter.quiz.err"));
    }
  }

  async function submit() {
    if (!quiz) return;
    setChecking(true);
    const payload = quiz.questions.map((_, i) => answers[i] ?? -1);
    const r = await fetch(`/api/edu/quiz/${quiz.quizId}/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: payload }),
    });
    setChecking(false);
    if (r.ok) {
      setResult(await r.json());
    } else {
      toast.error(t("chapter.quiz.stale"));
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">{t("chapter.quiz.title")}</h2>
        <Button size="sm" variant="outline" loading={busy} onClick={gen}>
          {quiz ? t("chapter.quiz.more") : t("chapter.quiz.start")}
        </Button>
      </div>
      {quiz ? (
        <div className="flex flex-col gap-4">
          {quiz.questions.map((q, qi) => (
            <div key={q.question}>
              <p className="mb-1.5 text-sm">{q.question}</p>
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt, oi) => {
                  const picked = answers[qi] === oi;
                  const res = result?.results[qi];
                  const cls = res
                    ? res.answerIndex === oi
                      ? "border-green-500 text-green-600"
                      : picked
                        ? "border-red-500 text-red-600"
                        : "border-border"
                    : picked
                      ? "border-foreground"
                      : "border-border";
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => !result && setAnswers((a) => ({ ...a, [qi]: oi }))}
                      className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent ${cls}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {result ? (
            <p className="text-sm">
              {t("chapter.result")}: <span className="font-semibold">{result.score}</span> /{" "}
              {result.total}
            </p>
          ) : (
            <Button size="sm" loading={checking} onClick={submit}>
              {t("chapter.check")}
            </Button>
          )}
        </div>
      ) : null}
    </Card>
  );
}

function Homework({ chapterId, prompt }: { chapterId: string; prompt: string | null }) {
  const { t } = useI18n();
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState<Feedback | null>(null);
  async function submit() {
    if (!answer.trim()) return;
    setBusy(true);
    setFb(null);
    const r = await fetch(`/api/edu/chapters/${chapterId}/homework`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answer }),
    });
    setBusy(false);
    if (r.ok) {
      setFb(await r.json());
    } else {
      toast.error(t("chapter.hw.err"));
    }
  }
  return (
    <Card>
      <h2 className="mb-1 font-medium">{t("chapter.hw.title")}</h2>
      {prompt ? <p className="mb-3 text-muted-foreground text-sm">{prompt}</p> : null}
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={4}
        placeholder={t("chapter.hw.placeholder")}
        className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-foreground"
      />
      <Button className="mt-2" size="sm" loading={busy} onClick={submit}>
        {t("chapter.hw.submit")}
      </Button>
      {fb ? (
        <div className="mt-3 rounded-lg border border-border bg-accent/40 p-3 text-sm">
          {fb.score !== null ? (
            <p className="mb-1 font-semibold">
              {t("chapter.hw.score")}: {fb.score} / 100
            </p>
          ) : null}
          <Markdown text={fb.feedback} />
          {fb.corrections.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {fb.corrections.map((c) => (
                <li key={c.wrong} className="text-xs">
                  <span className="text-red-600 line-through">{c.wrong}</span> →{" "}
                  <span className="text-green-600">{c.right}</span> — {c.why}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function AskAi({ chapterId }: { chapterId: string }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [a, setA] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function ask() {
    if (!q.trim()) return;
    setBusy(true);
    setA(null);
    const r = await fetch(`/api/edu/chapters/${chapterId}/ask`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: q }),
    });
    setBusy(false);
    if (r.ok) {
      setA((await r.json()).answer);
    } else {
      toast.error(t("chapter.ask.err"));
    }
  }
  return (
    <Card>
      <h2 className="mb-2 font-medium">{t("chapter.ask.title")}</h2>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("chapter.ask.placeholder")}
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
        />
        <Button size="sm" loading={busy} onClick={ask}>
          {t("chapter.ask.btn")}
        </Button>
      </div>
      {a ? (
        <div className="mt-3 rounded-lg border border-border bg-accent/40 p-3">
          <Markdown text={a} />
        </div>
      ) : null}
    </Card>
  );
}

function CompleteButton({ chapterId }: { chapterId: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  async function complete() {
    const r = await fetch(`/api/edu/chapters/${chapterId}/complete`, { method: "POST" });
    if (r.ok) {
      setDone(true);
      toast.success(t("chapter.complete.toast"));
    } else {
      toast.error(t("chapter.complete.err"));
    }
  }
  return (
    <Button variant={done ? "outline" : "primary"} onClick={complete} disabled={done}>
      {done ? t("chapter.completed") : t("chapter.complete")}
    </Button>
  );
}
