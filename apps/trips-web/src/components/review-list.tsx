"use client";

import { Badge, Button, Card, CardContent, cn, Input, Skeleton } from "@outegro/ui";
import { CheckIcon, ExternalLinkIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useConfirm, useProcess, useQueue, useResearch, useSkip, useUpdateNote } from "@/lib/api";
import { type TKey, useI18n } from "@/lib/i18n";
import type { Candidate, Reel } from "@/lib/types";
import { KakaoStaticMap } from "./kakao-static-map";
import { ReelPlayer } from "./reel-player";

/**
 * Everything waiting for review, as a list.
 *
 * This replaced a one-card-at-a-time conveyor with keyboard shortcuts. That shape optimised for
 * throughput over a hundred rows, but it hid the thing you actually decide on: you cannot
 * compare, you cannot scroll back, and each card had to be opened to see the reel or the map.
 * A list shows the video, the English summary, the category and the location together, which is
 * what "check what it found" means.
 */
export function ReviewList() {
  const { t } = useI18n();
  const queue = useQueue();
  const process = useProcess();

  if (queue.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const items = queue.data ?? [];

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

      {items.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground text-sm">{t("queue.empty")}</CardContent>
        </Card>
      ) : (
        items.map((reel) => <ReviewCard key={reel.id} reel={reel} />)
      )}
    </div>
  );
}

function ReviewCard({ reel }: { reel: Reel }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const skip = useSkip();
  const research = useResearch();
  const updateNote = useUpdateNote();

  const candidates = reel.candidates ?? [];
  const [picked, setPicked] = useState(0);
  const [manualQuery, setManualQuery] = useState("");
  const [noteDraft, setNoteDraft] = useState(reel.note ?? "");
  const chosen: Candidate | undefined = candidates[picked];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row">
        {/* The reel itself, already there rather than behind a click. */}
        <ReelPlayer reel={reel} className="w-full shrink-0 sm:w-44" />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {reel.extracted?.nameEn || chosen?.name || reel.note || reel.shortcode}
              </span>
              {reel.extracted?.categoryGroup ? (
                <Badge variant="secondary">
                  {t(`cat.${reel.extracted.categoryGroup}` as TKey)}
                </Badge>
              ) : null}
              {reel.extracted?.priceHint ? (
                <Badge variant="outline">{reel.extracted.priceHint}</Badge>
              ) : null}
            </div>
            {reel.extracted?.summary ? (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {reel.extracted.summary}
              </p>
            ) : null}
          </div>

          {/* Candidates, with the selected one shown on a map right here. */}
          {candidates.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {candidates.slice(0, 5).map((c, i) => (
                  <button
                    key={c.kakaoId}
                    type="button"
                    onClick={() => setPicked(i)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                      i === picked
                        ? "border-foreground bg-accent"
                        : "text-muted-foreground hover:bg-accent/50",
                    )}
                  >
                    <div className="truncate font-medium text-foreground">{c.name}</div>
                    <div className="truncate">{c.roadAddress ?? c.address}</div>
                  </button>
                ))}
              </div>
              {chosen ? (
                <KakaoStaticMap
                  lat={chosen.lat}
                  lng={chosen.lng}
                  name={chosen.name}
                  className="h-32 w-full shrink-0 sm:w-48"
                />
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">{t("queue.noCandidates")}</p>
          )}

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
                  .then(() => setPicked(0))
                  .catch(() => toast.error(t("toast.error")))
              }
            >
              {research.isPending ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
              {t("queue.research")}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={!chosen || confirm.isPending}
              onClick={() =>
                confirm
                  .mutateAsync({ id: reel.id, candidateIndex: picked })
                  .then(() => toast.success(t("queue.confirmed")))
                  .catch(() => toast.error(t("toast.error")))
              }
            >
              <CheckIcon />
              {t("queue.confirm")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={skip.isPending}
              onClick={() => skip.mutateAsync(reel.id).catch(() => toast.error(t("toast.error")))}
            >
              <XIcon />
              {t("queue.skip")}
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <a href={reel.url} target="_blank" rel="noreferrer">
                <ExternalLinkIcon />
                {reel.shortcode}
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
