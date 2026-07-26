"use client";

import { LanguageSwitcher, type Locale } from "@outegro/ui";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTransition } from "react";

/**
 * next-intl wiring around the shared switcher: persists the choice in the `NEXT_LOCALE`
 * cookie (read server-side by next-intl) and refreshes the route so server components
 * re-render with the new messages. The presentation lives in @outegro/ui so all five
 * frontends offer the same control.
 */
export function LangSwitch({ className }: { className?: string }) {
  const active = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(code: Locale) {
    // biome-ignore lint/suspicious/noDocumentCookie: a plain client-side locale preference cookie, no auth/security relevance
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <LanguageSwitcher
      value={active}
      onValueChange={pick}
      className={pending ? `${className ?? ""} opacity-60` : className}
    />
  );
}
