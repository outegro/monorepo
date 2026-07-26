"use client";

import { Badge, LanguageSwitcher } from "@outegro/ui";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const { t, locale, setLocale } = useI18n();

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <LanguageSwitcher
        value={locale}
        onValueChange={setLocale}
        className="absolute top-4 right-4"
      />
      <Badge variant="secondary">{t("badge")}</Badge>
      <h1 className="max-w-2xl text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="max-w-md text-pretty text-muted-foreground">{t("subtitle")}</p>
      <Badge variant="outline">{t("soon")}</Badge>
    </main>
  );
}
