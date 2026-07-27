"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from "@outegro/ui";
import { Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSubmitBatch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface Draft {
  key: number;
  url: string;
  note: string;
}

let nextKey = 1;
const blank = (): Draft => ({ key: nextKey++, url: "", note: "" });

/**
 * One card per reel: the link on top, then everything the sender knew about it underneath.
 *
 * This replaced a single `<url> | <note>` textarea. The pipe format worked for bare links, but
 * the notes that actually resolve a place — an address, opening hours, a price range — are
 * paragraphs, and nobody writes a paragraph after a pipe. Since the note is the strongest
 * signal the pipeline has, the form should make writing one feel natural rather than cramped.
 *
 * Pasting several lines into an empty URL field still expands them into separate cards, so a
 * block copied out of a DM thread does not have to be split by hand.
 */
export function AddReels() {
  const { t } = useI18n();
  const [drafts, setDrafts] = useState<Draft[]>([blank()]);
  const submit = useSubmitBatch();

  const filled = drafts.filter((d) => d.url.trim());

  function update(key: number, patch: Partial<Draft>) {
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  /** Multi-line paste into an empty URL field becomes one card per line. */
  function onUrlPaste(key: number, text: string) {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return false;
    setDrafts((ds) => {
      const i = ds.findIndex((d) => d.key === key);
      const made = lines.map((url) => ({ ...blank(), url }));
      return [...ds.slice(0, i), ...made, ...ds.slice(i + 1)];
    });
    return true;
  }

  async function send() {
    if (filled.length === 0) return;
    try {
      const r = await submit.mutateAsync({
        reels: filled.map((d) => ({ url: d.url.trim(), note: d.note.trim() || undefined })),
      });
      setDrafts([blank()]);
      const parts = [t("add.added", { n: r.created })];
      if (r.duplicates) parts.push(t("add.duplicates", { n: r.duplicates }));
      if (r.invalid.length) parts.push(t("add.invalid", { n: r.invalid.length }));
      toast.success(parts.join(" · "));
    } catch {
      toast.error(t("toast.error"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("add.title")}</CardTitle>
        <CardDescription>{t("add.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {drafts.map((d, i) => (
          <div key={d.key} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-muted-foreground text-xs tabular-nums">
                {i + 1}
              </span>
              <Input
                value={d.url}
                onChange={(e) => update(d.key, { url: e.target.value })}
                onPaste={(e) => {
                  if (d.url) return;
                  if (onUrlPaste(d.key, e.clipboardData.getData("text"))) e.preventDefault();
                }}
                placeholder="https://instagram.com/reel/…"
                className="font-mono text-xs"
                inputMode="url"
              />
              {drafts.length > 1 ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("add.remove")}
                  onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}
                >
                  <XIcon />
                </Button>
              ) : null}
            </div>
            <Textarea
              value={d.note}
              onChange={(e) => update(d.key, { note: e.target.value })}
              placeholder={t("add.notePlaceholder")}
              rows={3}
              className="resize-y"
            />
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDrafts((ds) => [...ds, blank()])}>
            <PlusIcon />
            {t("add.another")}
          </Button>
          <Button disabled={submit.isPending || filled.length === 0} onClick={send}>
            {submit.isPending ? <Loader2Icon className="animate-spin" /> : null}
            {filled.length > 1 ? t("add.submitN", { n: filled.length }) : t("add.submit")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
