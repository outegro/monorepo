"use client";

import { LanguageSwitcher, type Locale, writeLocaleCookie } from "@outegro/ui";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTransition } from "react";

/**
 * next-intl wiring around the shared switcher: writes the platform-wide `og_locale` cookie
 * (read server-side in i18n/request.ts) and refreshes the route so server components
 * re-render with the new messages. Both the cookie and the control live in @outegro/ui, so a
 * language picked here is the same one every other frontend sees.
 */
export function LangSwitch({ className }: { className?: string }) {
  const active = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(code: Locale) {
    writeLocaleCookie(code);
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
