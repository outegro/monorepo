"use client";

import { detectInitialLocale, type Locale, writeLocaleCookie } from "@outegro/ui";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type { Locale };

/**
 * Client i18n for Outegro Pay — flat typed dictionary + cookie-persisted switcher.
 * Languages: English (default) and Russian. The locale itself lives in the shared
 * `og_locale` cookie on `.outegro.com`, so the choice follows the user across services.
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
} as const;

export type TKey = keyof (typeof dict)["en"];

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TKey) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // English until the shared cookie says otherwise; resolved after mount so SSR and
  // the first client render agree.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(detectInitialLocale(document.cookie, navigator.language));
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    writeLocaleCookie(l);
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
