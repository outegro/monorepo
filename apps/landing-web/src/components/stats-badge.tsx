"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

async function fetchStats(): Promise<{ generated: number }> {
  const res = await fetch("/api/taglines/stats");
  return res.json();
}

export function StatsBadge() {
  const t = useTranslations("tagline");
  const { data } = useQuery({
    queryKey: ["tagline-stats"],
    queryFn: fetchStats,
    refetchInterval: 5000,
  });

  return (
    <p className="text-sm text-muted-foreground">{t("stats", { count: data?.generated ?? 0 })}</p>
  );
}
