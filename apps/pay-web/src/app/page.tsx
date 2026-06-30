"use client";

import { LOCALES, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Compact 5-language switcher (RU/EN/UZ/TJ/KG), shared style across Outegro web. */
function LangSwitch({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <div
      className={cn("flex items-center rounded-lg border border-border p-0.5 text-xs", className)}
    >
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={cn(
            "cursor-pointer rounded-md px-1.5 py-1 font-medium transition-colors",
            locale === code
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

export default function Home() {
  const { t } = useI18n();
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <LangSwitch className="absolute top-4 right-4" />
      <span className="rounded-full border border-border px-4 py-1 text-muted-foreground text-sm">
        {t("badge")}
      </span>
      <h1 className="max-w-2xl text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="max-w-md text-pretty text-muted-foreground">{t("subtitle")}</p>
      <span className="rounded bg-accent px-3 py-1 text-accent-foreground text-sm">
        {t("soon")}
      </span>
    </main>
  );
}
