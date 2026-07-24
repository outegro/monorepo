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
 * Client i18n for the budget UI — flat typed dictionary + cookie-persisted switcher.
 * Languages: Russian, English, Uzbek (Latin), Tajik (Cyrillic), Kyrgyz (Cyrillic).
 */
const dict = {
  en: {
    "gate.title": "Outegro Budget",
    "gate.tagline": "Cascading monthly budget with live FX conversion and cumulative caps.",
    "gate.signin": "Sign in with Outegro ID",
    "common.loading": "Loading…",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.add": "Add",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.close": "Close",
    "live.on": "Live",
    "live.connecting": "Connecting…",
    "nav.settings": "Settings",
    "nav.signout": "Sign out",
    "dash.title": "Months",
    "dash.empty": "No months yet — add your first one below.",
    "dash.addMonth": "+ Add month",
    "dash.startingBalance": "Starting balance",
    "dash.endingBalance": "Ending balance",
    "dash.expenses": "Expenses",
    "dash.incomes": "Incomes",
    "dash.net": "Net",
    "month.notes": "Notes",
    "month.closed": "Closed",
    "month.close": "Close month",
    "month.reopen": "Reopen",
    "month.delete": "Delete month",
    "month.addExpense": "+ Expense",
    "month.addIncome": "+ Income",
    "month.paid": "paid",
    "month.planned": "planned",
    "month.markPaid": "mark paid",
    "month.cumulative": "Cumulative caps",
    "month.remaining": "left",
    "form.name": "Name",
    "form.amount": "Amount",
    "form.currency": "Currency",
    "form.category": "Category",
    "form.count": "How many months",
    "form.useBase": "Apply recurring templates",
    "settings.title": "Settings",
    "settings.initialBalance": "Initial balance (USD)",
    "settings.baseExpenses": "Recurring expenses",
    "settings.baseIncomes": "Recurring incomes",
    "settings.cumulative": "Counts as a cumulative cap",
    "settings.fx": "Live FX rates",
    "settings.fxRefresh": "Refresh now",
    "settings.fxSource": "Source",
    "settings.fxUpdated": "Updated",
    "settings.back": "← Back to months",
    "toast.saved": "Saved",
    "toast.deleted": "Deleted",
    "toast.error": "Something went wrong",
  },
  ru: {
    "gate.title": "Outegro Бюджет",
    "gate.tagline": "Каскадный месячный бюджет с живой конвертацией валют и лимитами трат.",
    "gate.signin": "Войти через Outegro ID",
    "common.loading": "Загрузка…",
    "common.save": "Сохранить",
    "common.cancel": "Отмена",
    "common.add": "Добавить",
    "common.delete": "Удалить",
    "common.edit": "Изменить",
    "common.close": "Закрыть",
    "live.on": "Онлайн",
    "live.connecting": "Подключение…",
    "nav.settings": "Настройки",
    "nav.signout": "Выйти",
    "dash.title": "Месяцы",
    "dash.empty": "Пока нет месяцев — добавьте первый ниже.",
    "dash.addMonth": "+ Добавить месяц",
    "dash.startingBalance": "Начальный баланс",
    "dash.endingBalance": "Конечный баланс",
    "dash.expenses": "Расходы",
    "dash.incomes": "Доходы",
    "dash.net": "Итого",
    "month.notes": "Заметки",
    "month.closed": "Закрыт",
    "month.close": "Закрыть месяц",
    "month.reopen": "Открыть",
    "month.delete": "Удалить месяц",
    "month.addExpense": "+ Расход",
    "month.addIncome": "+ Доход",
    "month.paid": "оплачено",
    "month.planned": "план",
    "month.markPaid": "отметить оплаченным",
    "month.cumulative": "Лимиты трат",
    "month.remaining": "осталось",
    "form.name": "Название",
    "form.amount": "Сумма",
    "form.currency": "Валюта",
    "form.category": "Категория",
    "form.count": "Сколько месяцев",
    "form.useBase": "Применить регулярные шаблоны",
    "settings.title": "Настройки",
    "settings.initialBalance": "Начальный баланс (USD)",
    "settings.baseExpenses": "Регулярные расходы",
    "settings.baseIncomes": "Регулярные доходы",
    "settings.cumulative": "Считается лимитом трат",
    "settings.fx": "Курсы валют",
    "settings.fxRefresh": "Обновить сейчас",
    "settings.fxSource": "Источник",
    "settings.fxUpdated": "Обновлено",
    "settings.back": "← К месяцам",
    "toast.saved": "Сохранено",
    "toast.deleted": "Удалено",
    "toast.error": "Что-то пошло не так",
  },
  uz: {
    "gate.title": "Outegro Byudjet",
    "gate.tagline": "Valyuta konvertatsiyasi va xarajat limitlari bilan oylik byudjet.",
    "gate.signin": "Outegro ID bilan kirish",
    "common.loading": "Yuklanmoqda…",
    "common.save": "Saqlash",
    "common.cancel": "Bekor qilish",
    "common.add": "Qo'shish",
    "common.delete": "O'chirish",
    "common.edit": "Tahrirlash",
    "common.close": "Yopish",
    "live.on": "Onlayn",
    "live.connecting": "Ulanmoqda…",
    "nav.settings": "Sozlamalar",
    "nav.signout": "Chiqish",
    "dash.title": "Oylar",
    "dash.empty": "Hali oy yo'q — birinchisini quyida qo'shing.",
    "dash.addMonth": "+ Oy qo'shish",
    "dash.startingBalance": "Boshlang'ich balans",
    "dash.endingBalance": "Yakuniy balans",
    "dash.expenses": "Xarajatlar",
    "dash.incomes": "Daromadlar",
    "dash.net": "Jami",
    "month.notes": "Izohlar",
    "month.closed": "Yopilgan",
    "month.close": "Oyni yopish",
    "month.reopen": "Qayta ochish",
    "month.delete": "Oyni o'chirish",
    "month.addExpense": "+ Xarajat",
    "month.addIncome": "+ Daromad",
    "month.paid": "to'langan",
    "month.planned": "reja",
    "month.markPaid": "to'langan deb belgilash",
    "month.cumulative": "Xarajat limitlari",
    "month.remaining": "qoldi",
    "form.name": "Nomi",
    "form.amount": "Summa",
    "form.currency": "Valyuta",
    "form.category": "Kategoriya",
    "form.count": "Nechta oy",
    "form.useBase": "Doimiy shablonlarni qo'llash",
    "settings.title": "Sozlamalar",
    "settings.initialBalance": "Boshlang'ich balans (USD)",
    "settings.baseExpenses": "Doimiy xarajatlar",
    "settings.baseIncomes": "Doimiy daromadlar",
    "settings.cumulative": "Xarajat limiti hisoblanadi",
    "settings.fx": "Joriy valyuta kurslari",
    "settings.fxRefresh": "Hozir yangilash",
    "settings.fxSource": "Manba",
    "settings.fxUpdated": "Yangilangan",
    "settings.back": "← Oylarga qaytish",
    "toast.saved": "Saqlandi",
    "toast.deleted": "O'chirildi",
    "toast.error": "Nimadir xato ketdi",
  },
  tg: {
    "gate.title": "Outegro Буҷет",
    "gate.tagline": "Буҷети моҳонаи каскадӣ бо мубодилаи асъор ва лимити хароҷот.",
    "gate.signin": "Ворид шудан бо Outegro ID",
    "common.loading": "Боргузорӣ…",
    "common.save": "Захира",
    "common.cancel": "Бекор",
    "common.add": "Илова",
    "common.delete": "Ҳазф",
    "common.edit": "Таҳрир",
    "common.close": "Пӯшидан",
    "live.on": "Онлайн",
    "live.connecting": "Пайвастшавӣ…",
    "nav.settings": "Танзимот",
    "nav.signout": "Баромадан",
    "dash.title": "Моҳҳо",
    "dash.empty": "Ҳанӯз моҳе нест — аввалинро дар поён илова кунед.",
    "dash.addMonth": "+ Илова кардани моҳ",
    "dash.startingBalance": "Баланси ибтидоӣ",
    "dash.endingBalance": "Баланси ниҳоӣ",
    "dash.expenses": "Хароҷот",
    "dash.incomes": "Даромад",
    "dash.net": "Ҷамъ",
    "month.notes": "Ёддоштҳо",
    "month.closed": "Пӯшида",
    "month.close": "Пӯшидани моҳ",
    "month.reopen": "Кушодан",
    "month.delete": "Ҳазфи моҳ",
    "month.addExpense": "+ Хароҷот",
    "month.addIncome": "+ Даромад",
    "month.paid": "пардохта",
    "month.planned": "нақша",
    "month.markPaid": "пардохташуда қайд кардан",
    "month.cumulative": "Лимити хароҷот",
    "month.remaining": "монд",
    "form.name": "Ном",
    "form.amount": "Маблағ",
    "form.currency": "Асъор",
    "form.category": "Категория",
    "form.count": "Чанд моҳ",
    "form.useBase": "Истифодаи шаблонҳои доимӣ",
    "settings.title": "Танзимот",
    "settings.initialBalance": "Баланси ибтидоӣ (USD)",
    "settings.baseExpenses": "Хароҷоти доимӣ",
    "settings.baseIncomes": "Даромади доимӣ",
    "settings.cumulative": "Ҳамчун лимити хароҷот ҳисоб мешавад",
    "settings.fx": "Қурби асъор",
    "settings.fxRefresh": "Ҳозир навсозӣ",
    "settings.fxSource": "Манбаъ",
    "settings.fxUpdated": "Навсозӣ шуд",
    "settings.back": "← Ба моҳҳо",
    "toast.saved": "Захира шуд",
    "toast.deleted": "Ҳазф шуд",
    "toast.error": "Хатогӣ рӯй дод",
  },
  ky: {
    "gate.title": "Outegro Бюджет",
    "gate.tagline": "Валюта конвертациясы жана чыгым лимиттери менен айлык бюджет.",
    "gate.signin": "Outegro ID менен кирүү",
    "common.loading": "Жүктөлүүдө…",
    "common.save": "Сактоо",
    "common.cancel": "Жокко чыгаруу",
    "common.add": "Кошуу",
    "common.delete": "Өчүрүү",
    "common.edit": "Түзөтүү",
    "common.close": "Жабуу",
    "live.on": "Онлайн",
    "live.connecting": "Туташууда…",
    "nav.settings": "Жөндөөлөр",
    "nav.signout": "Чыгуу",
    "dash.title": "Айлар",
    "dash.empty": "Азырынча ай жок — биринчисин төмөндө кошуңуз.",
    "dash.addMonth": "+ Ай кошуу",
    "dash.startingBalance": "Баштапкы баланс",
    "dash.endingBalance": "Акыркы баланс",
    "dash.expenses": "Чыгымдар",
    "dash.incomes": "Кирешелер",
    "dash.net": "Жыйынтык",
    "month.notes": "Эскертүүлөр",
    "month.closed": "Жабылган",
    "month.close": "Айды жабуу",
    "month.reopen": "Кайра ачуу",
    "month.delete": "Айды өчүрүү",
    "month.addExpense": "+ Чыгым",
    "month.addIncome": "+ Кирише",
    "month.paid": "төлөндү",
    "month.planned": "план",
    "month.markPaid": "төлөндү деп белгилөө",
    "month.cumulative": "Чыгым лимиттери",
    "month.remaining": "калды",
    "form.name": "Аталышы",
    "form.amount": "Сумма",
    "form.currency": "Валюта",
    "form.category": "Категория",
    "form.count": "Канча ай",
    "form.useBase": "Туруктуу шаблондорду колдонуу",
    "settings.title": "Жөндөөлөр",
    "settings.initialBalance": "Баштапкы баланс (USD)",
    "settings.baseExpenses": "Туруктуу чыгымдар",
    "settings.baseIncomes": "Туруктуу кирешелер",
    "settings.cumulative": "Чыгым лимити катары эсептелет",
    "settings.fx": "Валюта курстары",
    "settings.fxRefresh": "Азыр жаңылоо",
    "settings.fxSource": "Булак",
    "settings.fxUpdated": "Жаңыланды",
    "settings.back": "← Айларга кайтуу",
    "toast.saved": "Сакталды",
    "toast.deleted": "Өчүрүлдү",
    "toast.error": "Бир нерсе туура эмес болду",
  },
} as const;

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
