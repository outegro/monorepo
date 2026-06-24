"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Step = "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    if (res.ok) {
      setStep("code");
    } else {
      setError("Could not send the code. Check the address and try again.");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/profile");
    } else {
      setError("Invalid or expired code.");
    }
  }

  async function passkeyLogin() {
    setBusy(true);
    setError(null);
    try {
      const optRes = await fetch("/api/auth/passkeys/authentication/options", { method: "POST" });
      if (!optRes.ok) {
        throw new Error("options");
      }
      const { challengeId, options } = await optRes.json();
      const response = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/passkeys/authentication/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId, response }),
      });
      if (verifyRes.ok) {
        router.push("/profile");
      } else {
        setError("Passkey sign-in failed.");
      }
    } catch {
      setError("Passkey sign-in was cancelled.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      <h1 className="font-semibold text-3xl tracking-tight">Sign in to Outegro</h1>
      {step === "email" ? (
        <form onSubmit={requestCode} className="flex w-full max-w-sm flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-md border border-border bg-background px-4 py-2.5 outline-none focus:border-foreground"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-foreground px-4 py-2.5 font-medium text-background disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex w-full max-w-sm flex-col gap-3">
          <p className="text-center text-muted-foreground text-sm">
            We emailed a 6-digit code to <span className="text-foreground">{email}</span>.
          </p>
          <input
            inputMode="numeric"
            pattern="\d{6}"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="rounded-md border border-border bg-background px-4 py-2.5 text-center tracking-[0.4em] outline-none focus:border-foreground"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-foreground px-4 py-2.5 font-medium text-background disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Verify & sign in"}
          </button>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="text-muted-foreground text-sm hover:text-foreground"
          >
            Use a different email
          </button>
        </form>
      )}
      {step === "email" ? (
        <>
          <div className="flex w-full max-w-sm items-center gap-3 text-muted-foreground text-xs">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <button
            type="button"
            onClick={passkeyLogin}
            disabled={busy}
            className="w-full max-w-sm rounded-md border border-border px-4 py-2.5 font-medium hover:bg-accent disabled:opacity-50"
          >
            Sign in with a passkey
          </button>
        </>
      ) : null}
      {error ? <p className="text-red-500 text-sm">{error}</p> : null}
    </main>
  );
}
