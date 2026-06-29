"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./icons";

type Variant = "primary" | "outline" | "ghost";
type Size = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all " +
  "cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/50 " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  // Celadon-jade pill with a glassy top highlight.
  primary:
    "bg-primary text-primary-foreground shadow-[0_6px_18px_-6px_var(--celadon),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-105",
  outline: "glass text-foreground hover:bg-accent",
  ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-sm",
  sm: "h-8 px-3.5 text-xs",
};

/** App button — consistent styling, always `cursor-pointer`, optional loading spinner. */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

/** Liquid-glass surface panel. */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("glass rounded-2xl p-5", className)}>{children}</section>;
}
