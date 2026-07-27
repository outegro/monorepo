"use client";

import { detectInitialLocale, type Locale, writeLocaleCookie } from "@outegro/ui";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type { Locale };

/**
 * Client i18n for itmaxxing (job-hunt copilot) — the lore-intake hook. Russian, English,
 * English (default) and Russian, stored in the shared `og_locale` cookie on `.outegro.com`.
 */
const dict = {
  en: {
    "gate.title": "itmaxxing",
    "gate.tagline":
      "Your job-hunt copilot. Brain-dump your career; the AI sharpens it, flags weak spots, and structures it into a résumé-ready knowledge base.",
    "gate.signin": "Sign in with Outegro ID",
    "common.loading": "Loading…",
    "nav.lore": "My lore",
    "nav.signout": "Sign out",
    "intake.title": "Tell me about your career",
    "intake.subtitle":
      "Roles, projects, education, wins — however it comes out. One pass turns it into a stronger, structured version of you.",
    "intake.placeholder": "I worked at… I built… I studied… I'm proud of…",
    "intake.submit": "Review with AI",
    "intake.reviewing": "Reviewing…",
    "intake.disabled": "AI is not configured yet.",
    "intake.tooShort": "Write a bit more first.",
    "review.original": "Your text",
    "review.improved": "Sharpened",
    "review.redflags": "Red flags",
    "review.noflags": "No red flags — solid.",
    "review.back": "← Edit",
    "review.accept": "Looks good — structure it",
    "review.structuring": "Structuring…",
    "lore.title": "Your lore",
    "lore.empty": "No entries yet. Run the intake to build your lore.",
    "lore.start": "Start intake",
    "lore.delete": "delete",
    "lore.added": "Added to your lore",
    "toast.error": "Something went wrong",
  },
  ru: {
    "gate.title": "itmaxxing",
    "gate.tagline":
      "Твой копайлот в поиске работы. Вывали свой опыт как есть — AI усилит формулировки, подсветит слабые места и разложит в структурированную базу для резюме.",
    "gate.signin": "Войти через Outegro ID",
    "common.loading": "Загрузка…",
    "nav.lore": "Мой лор",
    "nav.signout": "Выйти",
    "intake.title": "Расскажи о своём опыте",
    "intake.subtitle":
      "Роли, проекты, учёба, достижения — как пишется. За один проход это станет усиленной, структурированной версией тебя.",
    "intake.placeholder": "Я работал в… Я сделал… Я учился… Горжусь тем, что…",
    "intake.submit": "Разобрать с AI",
    "intake.reviewing": "Анализирую…",
    "intake.disabled": "AI пока не настроен.",
    "intake.tooShort": "Напиши чуть больше.",
    "review.original": "Твой текст",
    "review.improved": "Усилено",
    "review.redflags": "Ред-флаги",
    "review.noflags": "Ред-флагов нет — крепко.",
    "review.back": "← Править",
    "review.accept": "Ок — структурировать",
    "review.structuring": "Раскладываю…",
    "lore.title": "Твой лор",
    "lore.empty": "Пока пусто. Пройди интейк, чтобы собрать лор.",
    "lore.start": "Начать интейк",
    "lore.delete": "удалить",
    "lore.added": "Добавлено в лор",
    "toast.error": "Что-то пошло не так",
  },
} as const;

export type TKey = keyof (typeof dict)["en"];

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
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

  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
