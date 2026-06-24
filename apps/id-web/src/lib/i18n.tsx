"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "ru";

/**
 * Lightweight client i18n for the two auth screens — a typed dictionary + a switcher,
 * persisted to a cookie so the choice survives reloads (no next-intl routing needed for
 * a sign-in surface). Keys are flat; `{x}` placeholders are interpolated by `t(key, vars)`.
 */
const dict = {
  en: {
    "app.tagline": "One account for every Outegro product.",
    "login.title": "Sign in to Outegro",
    "login.email.placeholder": "you@example.com",
    "login.email.send": "Send code",
    "login.email.sending": "Sending…",
    "login.code.sent": "We sent a 6-digit code to {email}.",
    "login.code.placeholder": "123456",
    "login.code.verify": "Verify & sign in",
    "login.code.verifying": "Verifying…",
    "login.code.changeEmail": "Use a different email",
    "login.or": "or",
    "login.passkey": "Sign in with a passkey",
    "login.google": "Continue with Google",
    "login.err.send": "Could not send the code. Check the address and try again.",
    "login.err.code": "Invalid or expired code.",
    "login.err.passkey": "Passkey sign-in failed. Try again or use email.",
    "login.err.passkeyCancel": "Passkey sign-in was cancelled.",
    "profile.title": "Your account",
    "profile.signin.title": "How you sign in",
    "profile.email": "Email",
    "profile.unverified": "unverified",
    "profile.google": "Google",
    "profile.google.link": "Link account",
    "profile.passkeys": "Passkeys",
    "profile.telegram": "Telegram",
    "profile.telegram.connect": "Connect",
    "profile.telegram.connected": "Connected",
    "profile.telegram.disconnect": "Disconnect",
    "profile.telegram.waiting": "Waiting for Telegram… press Start in the bot.",
    "profile.telegram.linked": "Telegram connected.",
    "profile.telegram.unlinked": "Telegram disconnected.",
    "profile.passkeys.title": "Passkeys",
    "profile.passkeys.add": "Add passkey",
    "profile.passkeys.adding": "Adding…",
    "profile.passkeys.none": "No passkeys yet.",
    "profile.passkeys.added": "Passkey added.",
    "profile.passkeys.removed": "Passkey removed.",
    "profile.passkeys.remove": "Remove",
    "profile.passkeys.err": "Could not add the passkey. Try again.",
    "profile.passkeys.cancel": "Passkey setup was cancelled.",
    "profile.sessions.title": "Active sessions",
    "profile.sessions.others": "Sign out other sessions",
    "profile.sessions.thisDevice": "this device",
    "profile.sessions.end": "End",
    "profile.sessions.ended": "Session ended.",
    "profile.sessions.endedOthers": "Other sessions signed out.",
    "profile.signout": "Sign out",
    "method.email": "Email",
    "method.passkey": "Passkey",
    "method.google": "Google",
    "time.now": "just now",
    "time.m": "{n}m ago",
    "time.h": "{n}h ago",
    "time.d": "{n}d ago",
  },
  ru: {
    "app.tagline": "Один аккаунт для всех продуктов Outegro.",
    "login.title": "Вход в Outegro",
    "login.email.placeholder": "you@example.com",
    "login.email.send": "Отправить код",
    "login.email.sending": "Отправляем…",
    "login.code.sent": "Мы отправили 6-значный код на {email}.",
    "login.code.placeholder": "123456",
    "login.code.verify": "Подтвердить и войти",
    "login.code.verifying": "Проверяем…",
    "login.code.changeEmail": "Другой email",
    "login.or": "или",
    "login.passkey": "Войти по passkey",
    "login.google": "Продолжить с Google",
    "login.err.send": "Не удалось отправить код. Проверьте адрес и попробуйте снова.",
    "login.err.code": "Неверный или просроченный код.",
    "login.err.passkey": "Вход по passkey не удался. Попробуйте снова или войдите по email.",
    "login.err.passkeyCancel": "Вход по passkey отменён.",
    "profile.title": "Ваш аккаунт",
    "profile.signin.title": "Способы входа",
    "profile.email": "Email",
    "profile.unverified": "не подтверждён",
    "profile.google": "Google",
    "profile.google.link": "Привязать аккаунт",
    "profile.passkeys": "Passkeys",
    "profile.telegram": "Telegram",
    "profile.telegram.connect": "Привязать",
    "profile.telegram.connected": "Привязан",
    "profile.telegram.disconnect": "Отвязать",
    "profile.telegram.waiting": "Ждём Telegram… нажмите Start в боте.",
    "profile.telegram.linked": "Telegram привязан.",
    "profile.telegram.unlinked": "Telegram отвязан.",
    "profile.passkeys.title": "Passkeys",
    "profile.passkeys.add": "Добавить passkey",
    "profile.passkeys.adding": "Добавляем…",
    "profile.passkeys.none": "Пока нет passkey.",
    "profile.passkeys.added": "Passkey добавлен.",
    "profile.passkeys.removed": "Passkey удалён.",
    "profile.passkeys.remove": "Удалить",
    "profile.passkeys.err": "Не удалось добавить passkey. Попробуйте снова.",
    "profile.passkeys.cancel": "Добавление passkey отменено.",
    "profile.sessions.title": "Активные сессии",
    "profile.sessions.others": "Завершить другие сессии",
    "profile.sessions.thisDevice": "это устройство",
    "profile.sessions.end": "Завершить",
    "profile.sessions.ended": "Сессия завершена.",
    "profile.sessions.endedOthers": "Другие сессии завершены.",
    "profile.signout": "Выйти",
    "method.email": "Email",
    "method.passkey": "Passkey",
    "method.google": "Google",
    "time.now": "только что",
    "time.m": "{n} мин назад",
    "time.h": "{n} ч назад",
    "time.d": "{n} дн назад",
  },
} as const;

export type TKey = keyof (typeof dict)["en"];

interface I18nvalue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nvalue | null>(null);
const COOKIE = "og_locale";

function readCookieLocale(): Locale | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)og_locale=(en|ru)/);
  return (m?.[1] as Locale) ?? null;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Resolve initial locale on mount: cookie wins, else browser language.
  useEffect(() => {
    const fromCookie = readCookieLocale();
    if (fromCookie) {
      setLocaleState(fromCookie);
      return;
    }
    if (navigator.language?.toLowerCase().startsWith("ru")) {
      setLocaleState("ru");
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    // biome-ignore lint/suspicious/noDocumentCookie: a plain client-side locale preference cookie, no auth/security relevance
    document.cookie = `${COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) => {
      let s: string = dict[locale][key] ?? dict.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(`{${k}}`, String(v));
        }
      }
      return s;
    },
    [locale],
  );

  const value = useMemo<I18nvalue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nvalue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
