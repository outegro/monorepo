"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";

interface JobView {
  id: string;
  status: "pending" | "done" | "failed";
  taglines: string[];
  error: string | null;
}

const schema = z.object({ prompt: z.string().trim().min(3).max(280) });
type FormValues = z.infer<typeof schema>;

async function postPrompt(prompt: string): Promise<JobView> {
  const res = await fetch("/api/taglines", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function getJob(id: string): Promise<JobView> {
  const res = await fetch(`/api/taglines/${id}`);
  if (!res.ok) throw new Error("poll failed");
  return res.json();
}

export function TaglineGenerator() {
  const t = useTranslations("tagline");
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { prompt: "" },
  });

  const submit = useMutation({
    mutationFn: (values: FormValues) => postPrompt(values.prompt),
    onSuccess: (view) => {
      queryClient.setQueryData(["tagline", view.id], view);
      setJobId(view.id);
    },
    onError: (err) => {
      toast.error(err.message === "429" ? t("rateLimited") : t("failed"));
    },
  });

  const job = useQuery({
    queryKey: ["tagline", jobId],
    queryFn: () => getJob(jobId as string),
    enabled: jobId !== null,
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 1500 : false),
  });

  const view = job.data;
  const busy = submit.isPending || view?.status === "pending";

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={form.handleSubmit((v) => submit.mutate(v))} className="flex flex-col gap-3">
        <textarea
          {...form.register("prompt")}
          rows={3}
          placeholder={t("placeholder")}
          disabled={busy}
          className="w-full resize-none rounded-xl border border-border bg-background p-4 text-base text-foreground outline-none transition focus:ring-2 focus:ring-ring disabled:opacity-60"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {form.formState.errors.prompt ? t("tooShort") : ""}
          </span>
          <Button type="submit" disabled={busy} size="lg">
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            {busy ? t("generating") : t("generate")}
          </Button>
        </div>
      </form>

      <div className="mt-6 min-h-[2rem]">
        {view?.status === "pending" && (
          <p className="text-center text-sm text-muted-foreground">{t("queued")}</p>
        )}
        {view?.status === "failed" && (
          <p className="text-center text-sm text-destructive">{t("failed")}</p>
        )}
        <AnimatePresence>
          {view?.status === "done" && (
            <motion.ul
              className="flex flex-col gap-2"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            >
              {view.taglines.map((line) => (
                <TaglineCard
                  key={line}
                  text={line}
                  copyLabel={t("copy")}
                  copiedLabel={t("copied")}
                />
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TaglineCard({
  text,
  copyLabel,
  copiedLabel,
}: {
  text: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(copiedLabel);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <motion.li
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-accent/40 px-4 py-3"
    >
      <span className="text-base font-medium text-foreground">{text}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={copyLabel}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
      >
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
      </button>
    </motion.li>
  );
}
