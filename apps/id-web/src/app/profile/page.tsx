"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Me {
  id: string;
  email: string;
  emailVerified: boolean;
  locale: string;
}

interface Passkey {
  id: string;
  name: string | null;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPasskeys = useCallback(async () => {
    const res = await fetch("/api/auth/passkeys");
    if (res.ok) {
      setPasskeys(await res.json());
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.ok) {
          setMe(await res.json());
          await loadPasskeys();
        } else {
          router.replace("/login");
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router, loadPasskeys]);

  async function addPasskey() {
    setBusy(true);
    setError(null);
    try {
      const optRes = await fetch("/api/auth/passkeys/registration/options", { method: "POST" });
      if (!optRes.ok) {
        throw new Error("options");
      }
      const options = await optRes.json();
      const response = await startRegistration({ optionsJSON: options });
      const name = `${navigator.platform || "device"} · ${new Date().toLocaleDateString()}`;
      const verifyRes = await fetch("/api/auth/passkeys/registration/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response, name }),
      });
      if (!verifyRes.ok) {
        throw new Error("verify");
      }
      await loadPasskeys();
    } catch {
      setError("Could not add the passkey.");
    } finally {
      setBusy(false);
    }
  }

  async function removePasskey(id: string) {
    setBusy(true);
    await fetch(`/api/auth/passkeys/${id}`, { method: "DELETE" });
    await loadPasskeys();
    setBusy(false);
  }

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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-12">
      <h1 className="font-semibold text-3xl tracking-tight">Your account</h1>

      <dl className="rounded-lg border border-border p-5 text-sm">
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

      <section className="rounded-lg border border-border p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Passkeys</h2>
          <button
            type="button"
            onClick={addPasskey}
            disabled={busy}
            className="rounded-md bg-foreground px-3 py-1.5 font-medium text-background text-sm disabled:opacity-50"
          >
            Add passkey
          </button>
        </div>
        {passkeys.length === 0 ? (
          <p className="text-muted-foreground text-sm">No passkeys yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {passkeys.map((pk) => (
              <li key={pk.id} className="flex items-center justify-between text-sm">
                <span>{pk.name ?? pk.deviceType ?? "Passkey"}</span>
                <button
                  type="button"
                  onClick={() => removePasskey(pk.id)}
                  disabled={busy}
                  className="text-muted-foreground hover:text-red-500"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? <p className="text-red-500 text-sm">{error}</p> : null}

      <button
        type="button"
        onClick={logout}
        className="self-start rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
      >
        Sign out
      </button>
    </main>
  );
}
