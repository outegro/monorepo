"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GoogleIcon, PasskeyIcon, TelegramIcon } from "@/components/icons";
import { TopBar } from "@/components/top-bar";
import { Button, Card } from "@/components/ui";
import { type TKey, useI18n } from "@/lib/i18n";

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

/** Best-effort "Browser · OS" label from a user-agent string. */
function deviceLabel(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /iPhone|iPad|iOS/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X|Macintosh/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} · ${os}` : browser;
}

/** "City, COUNTRY" / "COUNTRY" / "" from the geo fields. */
function locationLabel(s: Session): string {
  if (s.city && s.country) return `${s.city}, ${s.country}`;
  return s.country ?? s.city ?? "";
}

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [me, setMe] = useState<Me | null>(null);
  const [identities, setIdentities] = useState<Identities | null>(null);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [telegram, setTelegram] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tgPending, setTgPending] = useState(false);
  const tgPoll = useRef<ReturnType<typeof setInterval> | null>(null);

  function relTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return t("time.now");
    if (m < 60) return t("time.m", { n: m });
    const h = Math.floor(m / 60);
    if (h < 24) return t("time.h", { n: h });
    return t("time.d", { n: Math.floor(h / 24) });
  }

  function methodLabel(method: string): string {
    const key = `method.${method}` as TKey;
    const label = t(key);
    return label === key ? method : label;
  }

  const refresh = useCallback(async () => {
    const [pk, ses, ids, tg] = await Promise.all([
      fetch("/api/auth/passkeys"),
      fetch("/api/auth/sessions"),
      fetch("/api/auth/identities"),
      fetch("/api/me/telegram"),
    ]);
    if (pk.ok) setPasskeys(await pk.json());
    if (ses.ok) setSessions(await ses.json());
    if (ids.ok) setIdentities(await ids.json());
    if (tg.ok) return (await tg.json()).linked === true;
    return null;
  }, []);

  const refreshAll = useCallback(async () => {
    const linked = await refresh();
    if (linked !== null) setTelegram(linked);
    return linked;
  }, [refresh]);

  // Poll Telegram status after opening the bot so the UI flips to "connected" on its own.
  const stopTgPoll = useCallback(() => {
    if (tgPoll.current) clearInterval(tgPoll.current);
    tgPoll.current = null;
    setTgPending(false);
  }, []);

  async function connectTelegram() {
    const res = await fetch("/api/auth/telegram/link-token", { method: "POST" });
    if (!res.ok) {
      toast.error("Telegram is unavailable right now.");
      return;
    }
    const { url } = await res.json();
    if (url) window.open(url, "_blank");
    setTgPending(true);
    const started = Date.now();
    stopTgPoll();
    tgPoll.current = setInterval(async () => {
      // Pause while the tab is backgrounded (the user is in Telegram); poll ONLY the link
      // status, not the whole profile — we just need to know when the webhook lands.
      if (document.hidden) {
        return;
      }
      const r = await fetch("/api/me/telegram");
      const linked = r.ok && (await r.json().catch(() => ({})))?.linked === true;
      if (linked) {
        stopTgPoll();
        setTelegram(true);
        await refreshAll();
        toast.success(t("profile.telegram.linked"));
      } else if (Date.now() - started > 90_000) {
        stopTgPoll();
      }
    }, 3000);
  }

  async function disconnectTelegram() {
    setBusy(true);
    await fetch("/api/me/telegram", { method: "DELETE" });
    await refreshAll();
    setBusy(false);
    toast.success(t("profile.telegram.unlinked"));
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.ok) {
          setMe(await res.json());
          await refreshAll();
        } else {
          router.replace("/login");
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
    return () => {
      if (tgPoll.current) clearInterval(tgPoll.current);
    };
  }, [router, refreshAll]);

  async function addPasskey() {
    setBusy(true);
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
      await refreshAll();
      toast.success(t("profile.passkeys.added"));
    } catch (err) {
      const cancelled = err instanceof Error && /NotAllowed|Abort/.test(err.name);
      toast.error(cancelled ? t("profile.passkeys.cancel") : t("profile.passkeys.err"));
    } finally {
      setBusy(false);
    }
  }

  async function removePasskey(id: string) {
    setBusy(true);
    await fetch(`/api/auth/passkeys/${id}`, { method: "DELETE" });
    await refreshAll();
    setBusy(false);
    toast.success(t("profile.passkeys.removed"));
  }

  async function terminate(id: string) {
    setBusy(true);
    await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
    await refreshAll();
    setBusy(false);
    toast.success(t("profile.sessions.ended"));
  }

  async function revokeOthers() {
    setBusy(true);
    await fetch("/api/auth/sessions/revoke-others", { method: "POST" });
    await refreshAll();
    setBusy(false);
    toast.success(t("profile.sessions.endedOthers"));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-muted-foreground text-sm">
        …
      </main>
    );
  }
  if (!me) return null;

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-6 py-14">
      <TopBar />
      <h1 className="font-semibold text-2xl tracking-tight">{t("profile.title")}</h1>

      {/* Sign-in methods */}
      <Card className="text-sm">
        <h2 className="mb-3 font-medium">{t("profile.signin.title")}</h2>
        <div className="flex items-center justify-between border-border/60 border-b py-2.5">
          <span className="text-muted-foreground">{t("profile.email")}</span>
          <span className="truncate pl-3">
            {me.email}{" "}
            {me.emailVerified ? (
              <span className="text-green-600">✓</span>
            ) : (
              <span className="text-muted-foreground text-xs">({t("profile.unverified")})</span>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between border-border/60 border-b py-2.5">
          <span className="flex items-center gap-2 text-muted-foreground">
            <GoogleIcon width={15} height={15} /> {t("profile.google")}
          </span>
          {identities?.google.length ? (
            <span className="truncate pl-3">{identities.google.join(", ")}</span>
          ) : (
            <a href="/api/auth/google/link" className="cursor-pointer font-medium underline">
              {t("profile.google.link")}
            </a>
          )}
        </div>
        <div className="flex items-center justify-between border-border/60 border-b py-2.5">
          <span className="flex items-center gap-2 text-muted-foreground">
            <PasskeyIcon width={15} height={15} /> {t("profile.passkeys")}
          </span>
          <span>{identities?.passkeys ?? passkeys.length}</span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="flex items-center gap-2 text-muted-foreground">
            <TelegramIcon width={15} height={15} /> {t("profile.telegram")}
          </span>
          {telegram ? (
            <button
              type="button"
              onClick={disconnectTelegram}
              disabled={busy}
              className="cursor-pointer font-medium text-muted-foreground transition-colors hover:text-red-500"
            >
              {t("profile.telegram.connected")} · {t("profile.telegram.disconnect")}
            </button>
          ) : tgPending ? (
            <span className="text-muted-foreground text-xs">{t("profile.telegram.waiting")}</span>
          ) : (
            <button
              type="button"
              onClick={connectTelegram}
              className="cursor-pointer font-medium underline"
            >
              {t("profile.telegram.connect")}
            </button>
          )}
        </div>
      </Card>

      {/* Passkeys */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">{t("profile.passkeys.title")}</h2>
          <Button size="sm" onClick={addPasskey} loading={busy}>
            <PasskeyIcon width={14} height={14} />
            {busy ? t("profile.passkeys.adding") : t("profile.passkeys.add")}
          </Button>
        </div>
        {passkeys.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("profile.passkeys.none")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {passkeys.map((pk) => (
              <li key={pk.id} className="flex items-center justify-between py-2 text-sm">
                <span>{pk.name ?? pk.deviceType ?? "Passkey"}</span>
                <button
                  type="button"
                  onClick={() => removePasskey(pk.id)}
                  disabled={busy}
                  className="cursor-pointer text-muted-foreground text-xs transition-colors hover:text-red-500"
                >
                  {t("profile.passkeys.remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Sessions */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">{t("profile.sessions.title")}</h2>
          {sessions.length > 1 ? (
            <button
              type="button"
              onClick={revokeOthers}
              disabled={busy}
              className="cursor-pointer text-muted-foreground text-xs transition-colors hover:text-red-500"
            >
              {t("profile.sessions.others")}
            </button>
          ) : null}
        </div>
        <ul className="flex flex-col divide-y divide-border/60">
          {sessions.map((s) => {
            const loc = locationLabel(s);
            return (
              <li key={s.id} className="flex items-start justify-between py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{deviceLabel(s.userAgent)}</span>
                    {s.current ? (
                      <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-green-600 text-xs">
                        {t("profile.sessions.thisDevice")}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-muted-foreground text-xs">
                    {methodLabel(s.authMethod)}
                    {loc ? ` · ${loc}` : ""}
                    {s.ip ? ` · ${s.ip}` : ""}
                  </div>
                  <div className="text-muted-foreground text-xs">{relTime(s.lastActiveAt)}</div>
                </div>
                {!s.current ? (
                  <button
                    type="button"
                    onClick={() => terminate(s.id)}
                    disabled={busy}
                    className="cursor-pointer text-muted-foreground text-xs transition-colors hover:text-red-500"
                  >
                    {t("profile.sessions.end")}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      <Button variant="outline" size="sm" className="self-start" onClick={logout}>
        {t("profile.signout")}
      </Button>
    </main>
  );
}
