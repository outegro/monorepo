import { Badge, Button } from "@outegro/ui";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LangSwitch } from "@/components/lang-switch";

export default async function HomePage() {
  const t = await getTranslations("hub");

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LangSwitch className="absolute top-4 right-4" />
      <div className="flex max-w-2xl flex-col items-center gap-6">
        <Badge variant="secondary">{t("eyebrow")}</Badge>
        <h1 className="text-balance font-bold text-4xl tracking-tight sm:text-5xl">{t("title")}</h1>
        <p className="max-w-md text-pretty text-muted-foreground">{t("subtitle")}</p>
        <Button asChild size="lg" className="mt-2">
          <Link href="https://id.outegro.com">{t("cta")}</Link>
        </Button>
        <p className="text-muted-foreground text-xs">{t("soon")}</p>
      </div>
    </main>
  );
}
