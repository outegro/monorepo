"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn.js";

type Variant = "primary" | "outline" | "ghost";
type Size = "md" | "sm" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all " +
  "cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/50 " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-[0_6px_18px_-6px_var(--primary),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-105",
  outline: "glass glass-press text-foreground hover:bg-accent",
  ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
};

const sizes: Record<Size, string> = {
  lg: "h-12 px-6 text-base",
  md: "h-11 px-5 text-sm",
  sm: "h-8 px-3.5 text-xs",
};

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/** Outegro platform button — glassy, always `cursor-pointer`, optional loading spinner. */
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
