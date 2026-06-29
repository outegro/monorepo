"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "./ui";

export interface Me {
  userId: string;
  roles: string[];
  isAdmin: boolean;
}

const ID_ORIGIN = "https://id.outegro.com";

/** Send the user to Outegro ID, asking it to return to the current edu page after sign-in. */
function goToLogin() {
  const next = typeof window !== "undefined" ? window.location.href : "https://edu.outegro.com/";
  window.location.href = `${ID_ORIGIN}/login?next=${encodeURIComponent(next)}`;
}

/** App header: brand + nav (+ Admin for staff). */
function Header({ me }: { me: Me }) {
  return (
    <header className="sticky top-0 z-10 border-border border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
        <Link href="/courses" className="flex items-center gap-2 font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background text-sm">
            한
          </span>
          Outegro Korean
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/courses" className="rounded-md px-3 py-1.5 hover:bg-accent">
            Курсы
          </Link>
          <Link href="/vocab" className="rounded-md px-3 py-1.5 hover:bg-accent">
            Словарь
          </Link>
          {me.isAdmin ? (
            <Link
              href="/admin"
              className="rounded-md px-3 py-1.5 font-medium text-amber-600 hover:bg-accent"
            >
              Админка
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

function LoginGate() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-foreground text-background text-xl">
        한
      </span>
      <h1 className="font-semibold text-2xl tracking-tight">Outegro Korean</h1>
      <p className="max-w-sm text-muted-foreground">
        Изучайте корейский: уроки, AI-проверка домашних заданий, словарь и тренажёр.
      </p>
      <Button onClick={goToLogin}>Войти через Outegro ID</Button>
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
