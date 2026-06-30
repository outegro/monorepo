"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LOCALES, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "./ui";

export interface Me {
  userId: string;
  roles: string[];
  isAdmin: boolean;
}

/** Compact 5-language switcher (RU/EN/UZ/TJ/KG), shared style with Outegro ID. */
function LangSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="flex items-center rounded-lg border border-border p-0.5 text-xs">
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

/** Send the user to Outegro ID, asking it to return to the current edu page after sign-in. */
function goToLogin() {
  const next = typeof window !== "undefined" ? window.location.href : "https://edu.outegro.com/";
  window.location.href = `${ID_ORIGIN}/login?next=${encodeURIComponent(next)}`;
}

/** App header: brand + nav (+ Admin for staff) + language switcher. */
function Header({ me }: { me: Me }) {
  const { t } = useI18n();
  return (
    <header className="glass sticky top-0 z-10 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-5">
        <Link href="/courses" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
            한
          </span>
          <span className="hidden sm:inline">Outegro Korean</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/courses" className="rounded-lg px-3 py-1.5 hover:bg-accent">
            {t("nav.courses")}
          </Link>
          <Link href="/vocab" className="rounded-lg px-3 py-1.5 hover:bg-accent">
            {t("nav.vocab")}
          </Link>
          {me.isAdmin ? (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-1.5 font-medium text-vermillion hover:bg-accent"
            >
              {t("nav.admin")}
            </Link>
          ) : null}
          <LangSwitch />
        </nav>
      </div>
    </header>
  );
}

function LoginGate() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="absolute top-4 right-4">
        <LangSwitch />
      </div>
      <div className="glass-strong flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
          한
        </span>
        <h1 className="font-semibold text-2xl tracking-tight">Outegro Korean</h1>
        <p className="text-muted-foreground text-sm">{t("gate.tagline")}</p>
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
    fetch("/api/edu/me")
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
      <Header me={me} />
      <div className="mx-auto max-w-3xl px-5 py-8">{children(me)}</div>
    </>
  );
}
