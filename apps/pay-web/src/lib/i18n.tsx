"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "ru" | "uz" | "tg" | "ky";

/** Locales offered in the switcher, in display order, with short native labels. */
export const LOCALES: { code: Locale; label: string }[] = [
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
  { code: "uz", label: "UZ" },
  { code: "tg", label: "TJ" },
  { code: "ky", label: "KG" },
];

/**
 * Client i18n for Outegro Pay — flat typed dictionary + cookie-persisted switcher.
 * Languages: Russian, English, Uzbek (Latin), Tajik (Cyrillic), Kyrgyz (Cyrillic).
 */
const dict = {
  en: {
    badge: "Outegro Pay",
    title: "Payments and billing",
    subtitle: "Manage your subscriptions and invoices.",
    soon: "Coming soon",
  },
  ru: {
    badge: "Outegro Pay",
    title: "Платежи и биллинг",
    subtitle: "Управляйте подписками и счетами.",
    soon: "Скоро",
  },
  uz: {
    badge: "Outegro Pay",
    title: "To'lovlar va billing",
    subtitle: "Obunalar va hisob-fakturalaringizni boshqaring.",
    soon: "Tez orada",
  },
  tg: {
    badge: "Outegro Pay",
    title: "Пардохтҳо ва биллинг",
    subtitle: "Обунаҳо ва ҳисобномаҳои худро идора кунед.",
    soon: "Ба зудӣ",
  },
  ky: {
    badge: "Outegro Pay",
    title: "Төлөмдөр жана биллинг",
    subtitle: "Жазылууларыңызды жана эсептериңизди башкарыңыз.",
    soon: "Жакында",
  },
} as const;

export type TKey = keyof (typeof dict)["en"];

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TKey) => string;
}

const I18nContext = createContext<I18nValue | null>(null);
const COOKIE = "og_locale";

function readCookieLocale(): Locale | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)og_locale=(en|ru|uz|tg|ky)/);
  return (m?.[1] as Locale) ?? null;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru");

  useEffect(() => {
    const fromCookie = readCookieLocale();
    if (fromCookie) {
      setLocaleState(fromCookie);
      return;
    }
    const lang = navigator.language?.toLowerCase() ?? "";
    const match = (["uz", "tg", "ky", "en"] as const).find((l) => lang.startsWith(l));
    if (match) setLocaleState(match);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    // biome-ignore lint/suspicious/noDocumentCookie: a plain client-side locale preference cookie, no auth/security relevance
    document.cookie = `${COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
  }, []);

  const t = useCallback((key: TKey) => dict[locale][key] ?? dict.en[key] ?? key, [locale]);

  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
