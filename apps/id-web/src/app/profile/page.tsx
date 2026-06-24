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

interface Identities {
  email: string | null;
  emailVerified: boolean;
  google: string[];
  passkeys: number;
}

interface Passkey {
  id: string;
  name: string | null;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string;
}

interface Session {
  id: string;
  authMethod: string;
  userAgent: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
  createdAt: string;
  lastActiveAt: string;
  current: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [identities, setIdentities] = useState<Identities | null>(null);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [pk, ses, ids] = await Promise.all([
      fetch("/api/auth/passkeys"),
      fetch("/api/auth/sessions"),
      fetch("/api/auth/identities"),
    ]);
    if (pk.ok) setPasskeys(await pk.json());
    if (ses.ok) setSessions(await ses.json());
    if (ids.ok) setIdentities(await ids.json());
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.ok) {
          setMe(await res.json());
          await refresh();
        } else {
          router.replace("/login");
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router, refresh]);

  async function addPasskey() {
    setBusy(true);
    setError(null);
    try {
      const optRes = await fetch("/api/auth/passkeys/registration/options", { method: "POST" });
      if (!optRes.ok) throw new Error("options");
      const options = await optRes.json();
      const response = await startRegistration({ optionsJSON: options });
      const name = `${navigator.platform || "device"} · ${new Date().toLocaleDateString()}`;
      const verifyRes = await fetch("/api/auth/passkeys/registration/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response, name }),
      });
      if (!verifyRes.ok) throw new Error("verify");
      await refresh();
    } catch {
      setError("Could not add the passkey.");
    } finally {
      setBusy(false);
    }
  }

  async function removePasskey(id: string) {
    setBusy(true);
    await fetch(`/api/auth/passkeys/${id}`, { method: "DELETE" });
    await refresh();
    setBusy(false);
  }

  async function terminate(id: string) {
    setBusy(true);
    await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
    await refresh();
    setBusy(false);
  }

  async function revokeOthers() {
    setBusy(true);
    await fetch("/api/auth/sessions/revoke-others", { method: "POST" });
    await refresh();
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
  if (!me) return null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-12">
      <h1 className="font-semibold text-3xl tracking-tight">Your account</h1>

      {/* Sign-in methods */}
      <section className="rounded-lg border border-border p-5 text-sm">
        <h2 className="mb-3 font-medium">How you sign in</h2>
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Email</span>
          <span>
            {me.email} {me.emailVerified ? "✓" : "(unverified)"}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Google</span>
          <span>{identities?.google.length ? identities.google.join(", ") : "not linked"}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-muted-foreground">Passkeys</span>
          <span>{identities?.passkeys ?? passkeys.length}</span>
        </div>
      </section>

      {/* Passkeys */}
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

      {/* Sessions */}
      <section className="rounded-lg border border-border p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Active sessions</h2>
          {sessions.length > 1 ? (
            <button
              type="button"
              onClick={revokeOthers}
              disabled={busy}
              className="text-muted-foreground text-sm hover:text-red-500"
            >
              Sign out others
            </button>
          ) : null}
        </div>
        <ul className="flex flex-col gap-3">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-start justify-between text-sm">
              <div>
                <div>
                  {s.authMethod}
                  {s.country ? ` · ${s.country}` : ""}
                  {s.current ? (
                    <span className="ml-2 text-green-600 text-xs">this device</span>
                  ) : null}
                </div>
                <div className="text-muted-foreground text-xs">
                  {s.ip ?? "?"} · active {timeAgo(s.lastActiveAt)}
                </div>
              </div>
              {!s.current ? (
                <button
                  type="button"
                  onClick={() => terminate(s.id)}
                  disabled={busy}
                  className="text-muted-foreground hover:text-red-500"
                >
                  End
                </button>
              ) : null}
            </li>
          ))}
        </ul>
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
