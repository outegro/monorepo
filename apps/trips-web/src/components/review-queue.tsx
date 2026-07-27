"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
} from "@outegro/ui";
import { ExternalLinkIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfirm, useProcess, useQueue, useResearch, useSkip, useUpdateNote } from "@/lib/api";
import { type TKey, useI18n } from "@/lib/i18n";
import type { Reel } from "@/lib/types";

/**
 * One reel at a time, keyboard-first. With 100+ reels the bottleneck is not the model or
 * Kakao — it is how fast a human can say "yes, that one". So: 1–9 pick a candidate, S skips,
 * and the queue advances on its own. Anything that would cost a mouse trip is a design bug.
 */
export function ReviewQueue() {
  const { t } = useI18n();
  const queue = useQueue();
  const process = useProcess();
  const confirm = useConfirm();
  const skip = useSkip();
  const research = useResearch();
  const updateNote = useUpdateNote();

  const [index, setIndex] = useState(0);
  const [manualQuery, setManualQuery] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  const items = queue.data ?? [];
  const reel: Reel | undefined = items[index];

  // A new reel means new drafts — otherwise the previous one's text bleeds into this card.
  useEffect(() => {
    setManualQuery(reel?.extracted?.query ?? reel?.note ?? "");
    setNoteDraft(reel?.note ?? "");
  }, [reel?.extracted?.query, reel?.note]);

  const candidates = reel?.candidates ?? [];

  function advance() {
    setIndex((i) => (i + 1 < items.length ? i : 0));
  }

  async function pick(candidateIndex: number) {
    if (!reel) return;
    try {
      await confirm.mutateAsync({ id: reel.id, candidateIndex });
      toast.success(t("toast.saved"));
      advance();
    } catch {
      toast.error(t("toast.error"));
    }
  }

  async function doSkip() {
    if (!reel) return;
    await skip.mutateAsync(reel.id).catch(() => toast.error(t("toast.error")));
    advance();
  }

  // Global shortcuts, suppressed while typing so notes can contain digits.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
      if (e.key >= "1" && e.key <= "9") {
        const i = Number(e.key) - 1;
        if (i < candidates.length) void pick(i);
      } else if (e.key.toLowerCase() === "s") {
        void doSkip();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (queue.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 text-sm">
          <p className="text-muted-foreground">{t("queue.empty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-semibold text-2xl tracking-tight">{t("queue.title")}</h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{t("queue.left", { n: items.length })}</Badge>
          <Button
            size="sm"
            variant="outline"
            disabled={process.isPending}
            onClick={() =>
              process
                .mutateAsync()
                .then((r) => toast.success(t("queue.processed", { n: r.processed })))
                .catch(() => toast.error(t("toast.error")))
            }
          >
            {process.isPending ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
            {process.isPending ? t("queue.processing") : t("queue.process")}
          </Button>
        </div>
      </div>

      {reel ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {reel.note || reel.shortcode}
              {reel.extracted?.categoryGroup ? (
                <Badge variant="secondary">
                  {t(`cat.${reel.extracted.categoryGroup}` as TKey)}
                </Badge>
              ) : null}
              {reel.extracted?.district ? (
                <Badge variant="outline">{reel.extracted.district}</Badge>
              ) : null}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <a
                href={reel.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-4"
              >
                <ExternalLinkIcon className="size-3" /> {reel.shortcode}
              </a>
              {reel.extracted?.priceHint ? <span>· {reel.extracted.priceHint}</span> : null}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {/* A better note re-runs the whole guess — usually faster than hand-searching. */}
            <div className="flex flex-wrap gap-2">
              <Input
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder={t("queue.notePlaceholder")}
                className="min-w-0 flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={updateNote.isPending || noteDraft === (reel.note ?? "")}
                onClick={() =>
                  updateNote
                    .mutateAsync({ id: reel.id, note: noteDraft || null })
                    .then(() => toast.success(t("toast.saved")))
                    .catch(() => toast.error(t("toast.error")))
                }
              >
                {t("common.save")}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Input
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder={t("queue.searchPlaceholder")}
                className="min-w-0 flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={research.isPending || !manualQuery.trim()}
                onClick={() =>
                  research
                    .mutateAsync({ id: reel.id, q: manualQuery.trim() })
                    .catch(() => toast.error(t("toast.error")))
                }
              >
                {research.isPending ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
                {t("queue.research")}
              </Button>
            </div>

            {candidates.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("queue.noCandidates")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {candidates.map((c, i) => (
                  <li key={c.kakaoId}>
                    <button
                      type="button"
                      onClick={() => pick(i)}
                      className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                    >
                      <Badge variant="outline" className="mt-0.5 shrink-0 font-mono">
                        {i + 1}
                      </Badge>
                      <span className="min-w-0">
                        <span className="block font-medium">{c.name}</span>
                        <span className="block text-muted-foreground text-xs">
                          {c.roadAddress || c.address}
                        </span>
                        {c.categoryName ? (
                          <span className="block text-muted-foreground text-xs">
                            {c.categoryName}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={doSkip} disabled={skip.isPending}>
                {t("queue.skip")} <Badge variant="outline">S</Badge>
              </Button>
              <span className="text-muted-foreground text-xs">1–9</span>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
