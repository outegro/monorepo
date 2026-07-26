"use client";

import { Badge, cn } from "@outegro/ui";
import { useI18n } from "@/lib/i18n";

/** Tiny connection indicator for the live-sync socket (pulses while connected). */
export function LiveBadge({ status }: { status: "connecting" | "live" | "off" }) {
  const { t } = useI18n();
  if (status === "off") return null;
  const live = status === "live";
  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <span className="relative flex size-2">
        {live ? (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-chart-2 opacity-75" />
        ) : null}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            live ? "bg-chart-2" : "bg-muted-foreground",
          )}
        />
      </span>
      {live ? t("live.on") : t("live.connecting")}
    </Badge>
  );
}
