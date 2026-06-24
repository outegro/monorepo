"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { GoogleIcon, PasskeyIcon } from "@/components/icons";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

type Step = "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    if (res.ok) {
      setStep("code");
    } else {
      toast.error(t("login.err.send"));
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/profile");
    } else {
      toast.error(t("login.err.code"));
    }
  }

  async function passkeyLogin() {
    setBusy(true);
    try {
      const optRes = await fetch("/api/auth/passkeys/authentication/options", { method: "POST" });
      if (!optRes.ok) throw new Error("options");
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
        toast.error(t("login.err.passkey"));
      }
    } catch (err) {
      // A user-cancelled WebAuthn ceremony throws NotAllowedError/AbortError — treat softly.
      const cancelled = err instanceof Error && /NotAllowed|Abort/.test(err.name);
      toast.error(cancelled ? t("login.err.passkeyCancel") : t("login.err.passkey"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-6">
      <TopBar />
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-foreground font-semibold text-background text-lg">
            O
          </div>
          <h1 className="font-semibold text-2xl tracking-tight">{t("login.title")}</h1>
        </div>

        {step === "email" ? (
          <form onSubmit={requestCode} className="flex flex-col gap-3">
            <input
              type="email"
              required
              // biome-ignore lint/a11y/noAutofocus: sign-in form — focusing the sole field is expected UX
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("login.email.placeholder")}
              className="h-11 rounded-lg border border-border bg-background px-4 text-sm outline-none transition-colors focus:border-foreground"
            />
            <Button type="submit" loading={busy}>
              {busy ? t("login.email.sending") : t("login.email.send")}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="flex flex-col gap-3">
            <p className="text-center text-muted-foreground text-sm">
              {t("login.code.sent", { email })}
            </p>
            <input
              inputMode="numeric"
              pattern="\d{6}"
              required
              // biome-ignore lint/a11y/noAutofocus: code step — focusing the code field is expected UX
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("login.code.placeholder")}
              className="h-12 rounded-lg border border-border bg-background text-center text-lg tracking-[0.5em] outline-none transition-colors focus:border-foreground"
            />
            <Button type="submit" loading={busy}>
              {busy ? t("login.code.verifying") : t("login.code.verify")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep("email")}>
              {t("login.code.changeEmail")}
            </Button>
          </form>
        )}

        {step === "email" ? (
          <>
            <div className="my-5 flex items-center gap-3 text-muted-foreground text-xs">
              <span className="h-px flex-1 bg-border" />
              {t("login.or")}
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="flex flex-col gap-3">
              <Button variant="outline" onClick={passkeyLogin} disabled={busy}>
                <PasskeyIcon />
                {t("login.passkey")}
              </Button>
              <a
                href="/api/auth/google/start"
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 font-medium text-sm transition-colors hover:bg-accent"
              >
                <GoogleIcon />
                {t("login.google")}
              </a>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
