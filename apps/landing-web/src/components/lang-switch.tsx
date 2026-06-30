"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

/** Locales offered in the switcher, in display order, with short native labels. */
const LOCALES = [
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
  { code: "uz", label: "UZ" },
  { code: "tg", label: "TJ" },
  { code: "ky", label: "KG" },
] as const;

/**
 * Compact 5-language switcher (RU/EN/UZ/TJ/KG). Persists the choice in the
 * `NEXT_LOCALE` cookie (read server-side by next-intl) and refreshes the route
 * so server components re-render with the new messages.
 */
export function LangSwitch({ className }: { className?: string }) {
  const active = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(code: string) {
    // biome-ignore lint/suspicious/noDocumentCookie: a plain client-side locale preference cookie, no auth/security relevance
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-border p-0.5 text-xs",
        pending && "opacity-60",
        className,
      )}
    >
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => pick(code)}
          className={cn(
            "cursor-pointer rounded-md px-1.5 py-1 font-medium transition-colors",
            active === code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
