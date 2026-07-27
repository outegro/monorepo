"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Textarea,
} from "@outegro/ui";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSubmitBatch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

/**
 * The paste box. Sized for the real workflow: a hundred links copied out of a DM thread go in
 * as one block, not one form submission at a time.
 */
export function AddReels() {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const submit = useSubmitBatch();

  async function send() {
    if (!text.trim()) return;
    try {
      const r = await submit.mutateAsync(text);
      setText("");
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
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("add.placeholder")}
          rows={6}
          className="font-mono text-xs"
        />
        <Button className="self-start" disabled={submit.isPending || !text.trim()} onClick={send}>
          {submit.isPending ? <Loader2Icon className="animate-spin" /> : null}
          {t("add.submit")}
        </Button>
      </CardContent>
    </Card>
  );
}
