import type { ReactNode } from "react";
import { cn } from "./cn.js";

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 font-medium text-muted-foreground text-xs",
        className,
      )}
    >
      {children}
    </span>
  );
}
