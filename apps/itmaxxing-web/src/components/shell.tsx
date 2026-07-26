"use client";

import { Button } from "@outegro/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LOCALES, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface Me {
  userId: string;
  roles: string[];
  isAdmin: boolean;
}

/** Compact 5-language switcher (RU/EN/UZ/TJ/KG), shared style with Outegro ID. */
function LangSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="glass flex items-center rounded-lg p-0.5 text-xs">
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

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
        im
      </span>
      <span className="hidden sm:inline">itmaxxing</span>
    </Link>
  );
}

function Header() {
  const { t } = useI18n();
  return (
    <header className="glass sticky top-0 z-10 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-5">
        <Brand />
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/lore" className="rounded-lg px-3 py-1.5 hover:bg-accent">
            {t("nav.lore")}
          </Link>
          <LangSwitch />
          <button
            type="button"
            onClick={signOut}
            className="cursor-pointer rounded-lg px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {t("nav.signout")}
          </button>
        </nav>
      </div>
    </header>
  );
}

function LoginGate() {
  const { t } = useI18n();
  return (
    <main className="liquid-canvas relative flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="absolute top-4 right-4">
        <LangSwitch />
      </div>
      <div className="glass-strong flex w-full max-w-md flex-col items-center gap-5 rounded-3xl p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-bold text-2xl text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
          im
        </span>
        <h1 className="font-semibold text-2xl tracking-tight">{t("gate.title")}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{t("gate.tagline")}</p>
        <Button className="w-full" onClick={goToLogin}>
          {t("gate.signin")}
        </Button>
      </div>
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
      <main className="flex min-h-dvh items-center justify-center text-muted-foreground">…</main>
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
