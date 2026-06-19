import { getTranslations } from "next-intl/server";
import { StatsBadge } from "@/components/stats-badge";
import { TaglineGenerator } from "@/components/tagline-generator";

export default async function HomePage() {
  const t = await getTranslations("tagline");

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
        {t("eyebrow")}
      </span>
      <div className="flex flex-col gap-3">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">{t("title")}</h1>
        <p className="text-pretty text-base text-muted-foreground">{t("subtitle")}</p>
      </div>
      <TaglineGenerator />
      <StatsBadge />
    </main>
  );
}
