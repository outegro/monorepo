"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LanguageSwitcher,
  Skeleton,
} from "@outegro/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

export interface Me {
  userId: string;
  roles: string[];
  isAdmin: boolean;
}

function LangSwitch() {
  const { locale, setLocale } = useI18n();
  return <LanguageSwitcher value={locale} onValueChange={setLocale} />;
}

const ID_ORIGIN = "https://id.outegro.com";

function goToLogin() {
  const next =
    typeof window !== "undefined" ? window.location.href : "https://itmaxxing.outegro.com/";
  window.location.href = `${ID_ORIGIN}/login?next=${encodeURIComponent(next)}`;
}

async function signOut() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
  window.location.href = "/";
}

function Logo({ className }: { className?: string }) {
  return (
    <span
      className={`flex items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground ${className ?? "size-7 text-xs"}`}
    >
      im
    </span>
  );
}

function Header() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo />
          <span className="hidden sm:inline">itmaxxing</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/lore">{t("nav.lore")}</Link>
          </Button>
          <LangSwitch />
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            {t("nav.signout")}
          </Button>
        </nav>
      </div>
    </header>
  );
}

function LoginGate() {
  const { t } = useI18n();
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="absolute top-4 right-4">
        <LangSwitch />
      </div>
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <Logo className="mx-auto size-14 rounded-2xl text-2xl" />
          <CardTitle className="text-2xl">{t("gate.title")}</CardTitle>
          <CardDescription>{t("gate.tagline")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={goToLogin}>
            {t("gate.signin")}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * Gate: resolves the current user via the BFF (which refreshes the shared Outegro session),
 * renders the header + page content for signed-in users, otherwise a login prompt.
 */
export function Shell({ children }: { children: (me: Me) => React.ReactNode }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? (r.json() as Promise<Me>) : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  if (me === undefined) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 px-5 py-8">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }
  if (me === null) {
    return <LoginGate />;
  }
  return (
    <>
      <Header />
      <div className="mx-auto max-w-5xl px-5 py-8">{children(me)}</div>
    </>
  );
}
