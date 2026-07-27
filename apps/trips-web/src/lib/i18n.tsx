"use client";

import type { Locale } from "@outegro/ui";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type { Locale };

/**
 * Client i18n for trips — the Korea reel catalogue. Only RU and EN are written out: this is a
 * two-person trip tool and the other platform locales would be dead weight, so uz/tg/ky alias
 * `en` rather than shipping untranslated keys that silently fall back anyway.
 */
const en = {
  "gate.title": "Trips",
  "gate.tagline":
    "Reels in, a reviewed map out. Paste the links your friends sent you and turn them into real places with coordinates.",
  "gate.signin": "Sign in with Outegro ID",
  "common.loading": "Loading…",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "nav.queue": "Review",
  "nav.places": "Places",
  "nav.signout": "Sign out",

  "add.title": "Add reels",
  "add.subtitle":
    "One per line. A note after | makes the difference between a match and a dead end — Instagram gives us nothing but the link.",
  "add.placeholder":
    "https://instagram.com/reel/XXXX/ | cafe in Seongsu\nhttps://instagram.com/reel/YYYY/ | 광장시장 먹자골목",
  "add.submit": "Add",
  "add.added": "Added {n}",
  "add.duplicates": "{n} already there",
  "add.invalid": "{n} lines were not Instagram links",

  "queue.title": "Review",
  "queue.empty": "Nothing waiting. Add some reels.",
  "queue.process": "Find places",
  "queue.processing": "Searching…",
  "queue.processed": "Processed {n}",
  "queue.note": "Note",
  "queue.notePlaceholder": "name, district, anything",
  "queue.research": "Search again",
  "queue.searchPlaceholder": "type a better query",
  "queue.noCandidates": "Nothing found — add a note or search by hand.",
  "queue.skip": "Skip",
  "queue.confirm": "This one",
  "queue.left": "{n} left",

  "places.title": "Places",
  "places.empty": "No confirmed places yet.",
  "places.day": "Day",
  "places.noDay": "Unscheduled",
  "places.navigate": "Navigate",
  "places.open": "Kakao",
  "places.count": "{n} places",

  "cat.FD6": "Food",
  "cat.CE7": "Cafe",
  "cat.AT4": "Attraction",
  "cat.CT1": "Culture",
  "cat.AD5": "Stay",

  "toast.saved": "Saved",
  "toast.error": "Something went wrong",
} as const;

const ru = {
  "gate.title": "Trips",
  "gate.tagline":
    "Рилсы на входе — проверенная карта на выходе. Закидываешь ссылки, которые накидали друзья, и получаешь реальные места с координатами.",
  "gate.signin": "Войти через Outegro ID",
  "common.loading": "Загрузка…",
  "common.save": "Сохранить",
  "common.cancel": "Отмена",
  "common.delete": "Удалить",
  "nav.queue": "Разбор",
  "nav.places": "Места",
  "nav.signout": "Выйти",

  "add.title": "Добавить рилсы",
  "add.subtitle":
    "По одному в строке. Заметка после | решает, найдётся место или нет — Instagram не отдаёт ничего, кроме ссылки.",
  "add.placeholder":
    "https://instagram.com/reel/XXXX/ | кафе в Соннсу\nhttps://instagram.com/reel/YYYY/ | 광장시장 먹자골목",
  "add.submit": "Добавить",
  "add.added": "Добавлено: {n}",
  "add.duplicates": "Уже было: {n}",
  "add.invalid": "Не ссылки на Instagram: {n}",

  "queue.title": "Разбор",
  "queue.empty": "Очередь пуста. Добавь рилсов.",
  "queue.process": "Найти места",
  "queue.processing": "Ищу…",
  "queue.processed": "Обработано: {n}",
  "queue.note": "Заметка",
  "queue.notePlaceholder": "название, район, что угодно",
  "queue.research": "Искать заново",
  "queue.searchPlaceholder": "введи запрос точнее",
  "queue.noCandidates": "Ничего не нашлось — добавь заметку или поищи вручную.",
  "queue.skip": "Пропустить",
  "queue.confirm": "Это оно",
  "queue.left": "Осталось: {n}",

  "places.title": "Места",
  "places.empty": "Подтверждённых мест пока нет.",
  "places.day": "День",
  "places.noDay": "Без дня",
  "places.navigate": "Маршрут",
  "places.open": "Kakao",
  "places.count": "Мест: {n}",

  "cat.FD6": "Поесть",
  "cat.CE7": "Кофе",
  "cat.AT4": "Посмотреть",
  "cat.CT1": "Развлечься",
  "cat.AD5": "Ночёвка",

  "toast.saved": "Сохранено",
  "toast.error": "Что-то пошло не так",
} as const;

const dict = { en, ru, uz: en, tg: en, ky: en } as const;

export type TKey = keyof (typeof dict)["en"];

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
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
