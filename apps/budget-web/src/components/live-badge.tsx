"use client";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Tiny connection indicator for the live-sync socket (green pulse when connected). */
export function LiveBadge({ status }: { status: "connecting" | "live" | "off" }) {
  const { t } = useI18n();
  if (status === "off") return null;
  const live = status === "live";
  return (
    <span className="glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-muted-foreground">
      <span className="relative flex h-2 w-2">
        {live ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-2 opacity-75" />
        ) : null}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            live ? "bg-chart-2" : "bg-muted-foreground",
          )}
        />
      </span>
      {live ? t("live.on") : t("live.connecting")}
    </span>
  );
}
