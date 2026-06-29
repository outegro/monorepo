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
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors " +
  "cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-foreground text-background hover:bg-foreground/90",
  outline: "border border-border bg-background hover:bg-accent",
  ghost: "hover:bg-accent text-muted-foreground hover:text-foreground",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
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

/** Bordered surface used for the profile sections. */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-border bg-background p-5", className)}>
      {children}
    </section>
  );
}
