"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "ru" | "uz" | "tg" | "ky";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
  { code: "uz", label: "UZ" },
  { code: "tg", label: "TJ" },
  { code: "ky", label: "KG" },
];

/**
 * Client i18n for itmaxxing (job-hunt copilot) — the lore-intake hook. Russian, English,
 * Uzbek (Latin), Tajik (Cyrillic), Kyrgyz (Cyrillic).
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
  uz: {
    "gate.title": "itmaxxing",
    "gate.tagline":
      "Ish qidirish bo'yicha yordamchingiz. Tajribangizni bo'shating — AI uni kuchaytiradi, zaif joylarni belgilaydi va rezyume uchun tuzilgan bazaga aylantiradi.",
    "gate.signin": "Outegro ID bilan kirish",
    "common.loading": "Yuklanmoqda…",
    "nav.lore": "Mening tajribam",
    "nav.signout": "Chiqish",
    "intake.title": "Karyerangiz haqida gapiring",
    "intake.subtitle":
      "Lavozimlar, loyihalar, ta'lim, yutuqlar — qanday bo'lsa. Bir o'tishda bu sizning kuchli, tuzilgan versiyangizga aylanadi.",
    "intake.placeholder": "Men … da ishladim… Men … yaratdim… Men … o'qidim…",
    "intake.submit": "AI bilan tahlil qilish",
    "intake.reviewing": "Tahlil qilinmoqda…",
    "intake.disabled": "AI hali sozlanmagan.",
    "intake.tooShort": "Avval biroz ko'proq yozing.",
    "review.original": "Sizning matn",
    "review.improved": "Kuchaytirilgan",
    "review.redflags": "Zaif joylar",
    "review.noflags": "Zaif joy yo'q — mustahkam.",
    "review.back": "← Tahrirlash",
    "review.accept": "Yaxshi — tuzilsin",
    "review.structuring": "Tuzilmoqda…",
    "lore.title": "Sizning tajribangiz",
    "lore.empty": "Hali yozuv yo'q. Tajribangizni yig'ish uchun intake'ni bajaring.",
    "lore.start": "Intake'ni boshlash",
    "lore.delete": "o'chirish",
    "lore.added": "Tajribaga qo'shildi",
    "toast.error": "Nimadir xato ketdi",
  },
  tg: {
    "gate.title": "itmaxxing",
    "gate.tagline":
      "Ёрдамчии шумо дар ҷустуҷӯи кор. Таҷрибаатонро озод кунед — AI онро тақвият медиҳад, ҷойҳои сустро нишон медиҳад ва ба базаи сохторёфта барои резюме табдил медиҳад.",
    "gate.signin": "Ворид шудан бо Outegro ID",
    "common.loading": "Боргузорӣ…",
    "nav.lore": "Таҷрибаи ман",
    "nav.signout": "Баромадан",
    "intake.title": "Дар бораи таҷрибаатон нақл кунед",
    "intake.subtitle":
      "Вазифаҳо, лоиҳаҳо, таҳсил, дастовардҳо — чӣ хеле ки ҳаст. Дар як гузариш ин ба версияи тақвиятёфта ва сохторёфтаи шумо табдил меёбад.",
    "intake.placeholder": "Ман дар … кор кардам… Ман … сохтам… Ман … хондам…",
    "intake.submit": "Бо AI таҳлил кардан",
    "intake.reviewing": "Таҳлил…",
    "intake.disabled": "AI ҳанӯз танзим нашудааст.",
    "intake.tooShort": "Аввал каме бештар нависед.",
    "review.original": "Матни шумо",
    "review.improved": "Тақвиятёфта",
    "review.redflags": "Ҷойҳои суст",
    "review.noflags": "Ҷойи суст нест — мустаҳкам.",
    "review.back": "← Таҳрир",
    "review.accept": "Хуб — сохтор кунед",
    "review.structuring": "Сохторкунӣ…",
    "lore.title": "Таҷрибаи шумо",
    "lore.empty": "Ҳанӯз чизе нест. Барои ҷамъоварӣ интейкро гузаронед.",
    "lore.start": "Оғози интейк",
    "lore.delete": "ҳазф",
    "lore.added": "Ба таҷриба илова шуд",
    "toast.error": "Хатогӣ рӯй дод",
  },
  ky: {
    "gate.title": "itmaxxing",
    "gate.tagline":
      "Жумуш издөөдөгү жардамчыңыз. Тажрыйбаңызды төгүңүз — AI аны күчөтөт, алсыз жерлерди белгилейт жана резюме үчүн структураланган базага айлантырат.",
    "gate.signin": "Outegro ID менен кирүү",
    "common.loading": "Жүктөлүүдө…",
    "nav.lore": "Менин тажрыйбам",
    "nav.signout": "Чыгуу",
    "intake.title": "Карьераңыз жөнүндө айтыңыз",
    "intake.subtitle":
      "Кызматтар, долбоорлор, билим, жетишкендиктер — кандай болсо. Бир өтүүдө бул сиздин күчтүү, структураланган версияңызга айланат.",
    "intake.placeholder": "Мен … иштедим… Мен … жасадым… Мен … окудум…",
    "intake.submit": "AI менен талдоо",
    "intake.reviewing": "Талдоодо…",
    "intake.disabled": "AI азырынча жөндөлгөн эмес.",
    "intake.tooShort": "Адегенде бир аз көбүрөөк жазыңыз.",
    "review.original": "Сиздин текст",
    "review.improved": "Күчөтүлдү",
    "review.redflags": "Алсыз жерлер",
    "review.noflags": "Алсыз жер жок — бекем.",
    "review.back": "← Оңдоо",
    "review.accept": "Жакшы — структуралаңыз",
    "review.structuring": "Структуралоодо…",
    "lore.title": "Сиздин тажрыйба",
    "lore.empty": "Азырынча жазуу жок. Тажрыйбаны чогултуу үчүн интейкти өтүңүз.",
    "lore.start": "Интейкти баштоо",
    "lore.delete": "өчүрүү",
    "lore.added": "Тажрыйбага кошулду",
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
