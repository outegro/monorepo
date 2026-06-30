import { getTranslations } from "next-intl/server";
import { LangSwitch } from "@/components/lang-switch";

export default async function HomePage() {
  const t = await getTranslations("hub");

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <LangSwitch className="absolute top-4 right-4" />
      {/* decorative backdrop */}
      <div
        aria-hidden
        className="-z-10 pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 12%, transparent), transparent 70%)",
        }}
      />
      <div className="flex max-w-2xl flex-col items-center gap-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-medium text-muted-foreground text-xs">
          {t("eyebrow")}
        </span>
        <h1 className="text-balance font-bold text-5xl tracking-tight sm:text-6xl">{t("title")}</h1>
        <p className="max-w-md text-pretty text-base text-muted-foreground">{t("subtitle")}</p>
        <a
          href="https://id.outegro.com"
          className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 font-medium text-primary-foreground text-sm transition-opacity hover:opacity-90"
        >
          {t("cta")}
        </a>
        <p className="text-muted-foreground text-xs">{t("soon")}</p>
      </div>
    </main>
  );
}
