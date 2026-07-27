"use client";

import { detectInitialLocale, type Locale, writeLocaleCookie } from "@outegro/ui";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type { Locale };

/**
 * Client i18n for the budget UI — flat typed dictionary + cookie-persisted switcher.
 * Languages: English (default) and Russian. The locale itself lives in the shared
 * `og_locale` cookie on `.outegro.com`, so the choice follows the user across services.
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
