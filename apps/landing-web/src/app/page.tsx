import { Badge } from "@outegro/ui";
import { getTranslations } from "next-intl/server";
import { LangSwitch } from "@/components/lang-switch";

export default async function HomePage() {
  const t = await getTranslations("hub");

  return (
    <main className="liquid-canvas relative flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LangSwitch className="absolute top-4 right-4" />
      <div className="flex max-w-2xl flex-col items-center gap-6">
        <Badge className="glass border-none">{t("eyebrow")}</Badge>
        <h1 className="text-balance font-bold text-5xl tracking-tight sm:text-6xl">{t("title")}</h1>
        <p className="max-w-md text-pretty text-base text-muted-foreground">{t("subtitle")}</p>
        <a
          href="https://id.outegro.com"
          className="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-7 font-medium text-primary-foreground text-sm shadow-[0_6px_18px_-6px_var(--primary),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:brightness-105 active:scale-[0.98]"
        >
          {t("cta")}
        </a>
        <p className="text-muted-foreground text-xs">{t("soon")}</p>
      </div>
    </main>
  );
}
