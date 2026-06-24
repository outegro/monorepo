"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Me {
  id: string;
  email: string;
  emailVerified: boolean;
  locale: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.ok) {
          setMe(await res.json());
        } else {
          router.replace("/login");
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-muted-foreground">
        Loading…
      </main>
    );
  }
  if (!me) {
    return null;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      <h1 className="font-semibold text-3xl tracking-tight">Your account</h1>
      <dl className="w-full max-w-sm rounded-lg border border-border p-5 text-sm">
        <div className="flex justify-between py-1">
          <dt className="text-muted-foreground">Email</dt>
          <dd>{me.email}</dd>
        </div>
        <div className="flex justify-between py-1">
          <dt className="text-muted-foreground">Verified</dt>
          <dd>{me.emailVerified ? "yes" : "no"}</dd>
        </div>
        <div className="flex justify-between py-1">
          <dt className="text-muted-foreground">Locale</dt>
          <dd>{me.locale}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={logout}
        className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
      >
        Sign out
      </button>
    </main>
  );
}
