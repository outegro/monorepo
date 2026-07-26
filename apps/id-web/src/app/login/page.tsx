"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Separator,
} from "@outegro/ui";
import { startAuthentication } from "@simplewebauthn/browser";
import { FingerprintIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { GoogleIcon } from "@/components/icons";
import { TopBar } from "@/components/top-bar";
import { useI18n } from "@/lib/i18n";
import { safeNextUrl } from "@/lib/next-url";

type Step = "email" | "code";

/** Navigate to the post-login destination (cross-origin next, else local profile). */
function landAfterLogin(router: { push: (p: string) => void }) {
  const next =
    typeof window === "undefined"
      ? null
      : safeNextUrl(new URLSearchParams(window.location.search).get("next"));
  if (next) {
    window.location.href = next;
  } else {
    router.push("/profile");
  }
}

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
      landAfterLogin(router);
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
        landAfterLogin(router);
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
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-xl bg-primary font-semibold text-lg text-primary-foreground">
            O
          </div>
          <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
          {step === "code" ? (
            <CardDescription>{t("login.code.sent", { email })}</CardDescription>
          ) : null}
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {step === "email" ? (
            <form onSubmit={requestCode} className="flex flex-col gap-3">
              <Input
                type="email"
                required
                // biome-ignore lint/a11y/noAutofocus: sign-in form — focusing the sole field is expected UX
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("login.email.placeholder")}
              />
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2Icon className="animate-spin" /> : null}
                {busy ? t("login.email.sending") : t("login.email.send")}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="flex flex-col gap-3">
              <Input
                inputMode="numeric"
                pattern="\d{6}"
                required
                // biome-ignore lint/a11y/noAutofocus: code step — focusing the code field is expected UX
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("login.code.placeholder")}
                className="h-12 text-center text-lg tracking-[0.5em]"
              />
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2Icon className="animate-spin" /> : null}
                {busy ? t("login.code.verifying") : t("login.code.verify")}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep("email")}>
                {t("login.code.changeEmail")}
              </Button>
            </form>
          )}

          {step === "email" ? (
            <>
              <div className="flex items-center gap-3 text-muted-foreground text-xs">
                <Separator className="flex-1" />
                {t("login.or")}
                <Separator className="flex-1" />
              </div>
              <div className="flex flex-col gap-3">
                <Button variant="outline" onClick={passkeyLogin} disabled={busy}>
                  <FingerprintIcon />
                  {t("login.passkey")}
                </Button>
                <Button variant="outline" asChild>
                  <a href="/api/auth/google/start">
                    <GoogleIcon />
                    {t("login.google")}
                  </a>
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
