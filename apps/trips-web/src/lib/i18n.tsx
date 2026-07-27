"use client";

import { detectInitialLocale, type Locale, writeLocaleCookie } from "@outegro/ui";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type { Locale };

/**
 * Client i18n for trips — the Korea reel catalogue. Only RU and EN are written out: this is a
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
  "nav.plan": "Plan",
  "nav.signout": "Sign out",

  "add.title": "Add reels",
  "add.subtitle":
    "One per line. A note after | makes the difference between a match and a dead end — Instagram gives us nothing but the link.",
  "add.placeholder":
    "https://instagram.com/reel/XXXX/ | cafe in Seongsu\nhttps://instagram.com/reel/YYYY/ | 광장시장 먹자골목",
  "add.submit": "Add",
  "add.submitN": "Add {n} reels",
  "add.another": "Another reel",
  "add.remove": "Remove",
  "add.notePlaceholder":
    "Anything you know: name, address, district, price, opening hours. The address is what resolves the place most reliably.",
  "add.added": "Added {n}",
  "add.duplicates": "{n} already there",
  "add.invalid": "{n} were not Instagram links",
  "queue.summary": "What it is",
  "queue.watch": "Watch",
  "queue.noVideo": "Video unavailable",
  "queue.caption": "Caption",

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
  "nav.plan": "План",
  "nav.signout": "Выйти",

  "add.title": "Добавить рилсы",
  "add.subtitle":
    "По одному в строке. Заметка после | решает, найдётся место или нет — Instagram не отдаёт ничего, кроме ссылки.",
  "add.placeholder":
    "https://instagram.com/reel/XXXX/ | кафе в Соннсу\nhttps://instagram.com/reel/YYYY/ | 광장시장 먹자골목",
  "add.submit": "Добавить",
  "add.submitN": "Добавить {n}",
  "add.another": "Ещё рилс",
  "add.remove": "Убрать",
  "add.notePlaceholder":
    "Всё, что знаешь: название, адрес, район, цена, часы работы. Адрес резолвит место надёжнее всего.",
  "add.added": "Добавлено: {n}",
  "add.duplicates": "Уже было: {n}",
  "add.invalid": "Не ссылки на Instagram: {n}",
  "queue.summary": "Что это",
  "queue.watch": "Смотреть",
  "queue.noVideo": "Видео недоступно",
  "queue.caption": "Подпись",

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

const dict = { en, ru } as const;

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
