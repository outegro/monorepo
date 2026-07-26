import type { ReactNode } from "react";
import { cn } from "./cn.js";

type Tint = "none" | "cool" | "warm" | "green";

const tintClass: Record<Tint, string> = {
  none: "glass",
  cool: "glass-tint",
  warm: "glass-tint-warm",
  green: "glass-tint-green",
};

export interface CardProps {
  className?: string;
  children: ReactNode;
  tint?: Tint;
  strong?: boolean;
}

/** Liquid-glass surface panel. */
export function Card({ className, children, tint = "none", strong = false }: CardProps) {
  return (
    <section
      className={cn(strong ? "glass-strong" : tintClass[tint], "rounded-2xl p-5", className)}
    >
      {children}
    </section>
  );
}
