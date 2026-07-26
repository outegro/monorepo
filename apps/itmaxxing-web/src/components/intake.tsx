"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Textarea,
} from "@outegro/ui";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
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
        <Card>
          <CardContent className="flex flex-col gap-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("intake.placeholder")}
              rows={12}
              className="resize-y leading-relaxed"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-xs">
                {llmEnabled ? `${text.trim().length} ch` : t("intake.disabled")}
              </span>
              <Button size="lg" disabled={!llmEnabled || reviewMut.isPending} onClick={runReview}>
                {reviewMut.isPending ? <Loader2Icon className="animate-spin" /> : null}
                {reviewMut.isPending ? t("intake.reviewing") : t("intake.submit")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // step === "review"
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => setStep("input")}>
          <ArrowLeftIcon />
          {t("review.back")}
        </Button>
        <Button disabled={structureMut.isPending} onClick={accept}>
          {structureMut.isPending ? <Loader2Icon className="animate-spin" /> : null}
          {structureMut.isPending ? t("review.structuring") : t("review.accept")}
        </Button>
      </div>

      {review?.summary ? (
        <Card>
          <CardContent className="text-sm">{review.summary}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription className="uppercase tracking-wide">
              {t("review.original")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
              {text}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-wide">
              {t("review.improved")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{review?.improved}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {t("review.redflags")}
        </span>
        {review && review.redFlags.length > 0 ? (
          <div className="flex flex-col gap-2">
            {review.redFlags.map((f) => (
              <Card key={`${f.issue}::${f.where}`}>
                <CardContent className="flex flex-col gap-1.5 text-sm">
                  <Badge variant="destructive" className="w-fit">
                    {f.issue}
                  </Badge>
                  {f.where ? (
                    <p className="text-muted-foreground text-xs italic">“{f.where}”</p>
                  ) : null}
                  {f.why ? <p>{f.why}</p> : null}
                  {f.fix ? (
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">→ </span>
                      {f.fix}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-muted-foreground text-sm">
              {t("review.noflags")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
