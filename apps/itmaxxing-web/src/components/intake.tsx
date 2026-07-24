"use client";

import { Badge, Button, Card } from "@outegro/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useReviewIntake, useStructure } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { IntakeReview } from "@/lib/types";

type Step = "input" | "review";

/**
 * The lore-intake hook (design §2.1). Step 1: freeform brain-dump. Step 2: split view —
 * original vs AI-sharpened, plus red-flag cards. Step 3: accept → structure into lore_entries.
 */
export function Intake({ llmEnabled }: { llmEnabled: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [review, setReview] = useState<IntakeReview | null>(null);

  const reviewMut = useReviewIntake();
  const structureMut = useStructure();

  async function runReview() {
    if (text.trim().length < 20) {
      toast.error(t("intake.tooShort"));
      return;
    }
    try {
      const r = await reviewMut.mutateAsync(text.trim());
      setReview(r);
      setStep("review");
    } catch {
      toast.error(t("toast.error"));
    }
  }

  async function accept() {
    if (!review) return;
    try {
      await structureMut.mutateAsync(review.improved);
      toast.success(t("lore.added"));
      router.push("/lore");
    } catch {
      toast.error(t("toast.error"));
    }
  }

  if (step === "input") {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">{t("intake.title")}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-relaxed">
            {t("intake.subtitle")}
          </p>
        </div>
        <Card strong className="flex flex-col gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("intake.placeholder")}
            rows={12}
            className="w-full resize-y rounded-xl border border-border bg-transparent p-4 text-sm leading-relaxed outline-none focus:border-primary"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-xs">
              {llmEnabled ? `${text.trim().length} ch` : t("intake.disabled")}
            </span>
            <Button
              size="lg"
              loading={reviewMut.isPending}
              disabled={!llmEnabled}
              onClick={runReview}
            >
              {reviewMut.isPending ? t("intake.reviewing") : t("intake.submit")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // step === "review"
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep("input")}
          className="cursor-pointer text-muted-foreground text-sm hover:text-foreground"
        >
          {t("review.back")}
        </button>
        <Button loading={structureMut.isPending} onClick={accept}>
          {structureMut.isPending ? t("review.structuring") : t("review.accept")}
        </Button>
      </div>

      {review?.summary ? (
        <Card tint="cool" className="text-sm">
          {review.summary}
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            {t("review.original")}
          </span>
          <p className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
            {text}
          </p>
        </Card>
        <Card strong className="flex flex-col gap-2">
          <span className="font-medium text-primary text-xs uppercase tracking-wide">
            {t("review.improved")}
          </span>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{review?.improved}</p>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {t("review.redflags")}
        </span>
        {review && review.redFlags.length > 0 ? (
          <div className="flex flex-col gap-2">
            {review.redFlags.map((f) => (
              <Card
                key={`${f.issue}::${f.where}`}
                tint="warm"
                className="flex flex-col gap-1.5 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge className="border-none bg-destructive/15 text-destructive">
                    🚩 {f.issue}
                  </Badge>
                </div>
                {f.where ? (
                  <p className="text-muted-foreground text-xs italic">“{f.where}”</p>
                ) : null}
                {f.why ? <p className="text-sm">{f.why}</p> : null}
                {f.fix ? (
                  <p className="text-chart-2 text-sm">
                    <span className="font-medium">→ </span>
                    {f.fix}
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <Card tint="green" className="text-sm">
            {t("review.noflags")}
          </Card>
        )}
      </div>
    </div>
  );
}
