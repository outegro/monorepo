"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "ru" | "uz" | "tg" | "ky";

/** Locales offered in the switcher, in display order, with their native short labels. */
export const LOCALES: { code: Locale; label: string }[] = [
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
  { code: "uz", label: "UZ" },
  { code: "tg", label: "TJ" },
  { code: "ky", label: "KG" },
];

/**
 * Lightweight client i18n for the auth screens — a typed dictionary + a switcher, persisted
 * to a cookie so the choice survives reloads (no next-intl routing needed for a sign-in
 * surface). Keys are flat; `{x}` placeholders are interpolated by `t(key, vars)`. Languages:
 * Russian, English, Uzbek (Latin), Tajik (Cyrillic), Kyrgyz (Cyrillic).
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
  uz: {
    "app.tagline": "Barcha Outegro mahsulotlari uchun yagona hisob.",
    "login.title": "Outegro'ga kirish",
    "login.email.placeholder": "you@example.com",
    "login.email.send": "Kod yuborish",
    "login.email.sending": "Yuborilmoqda…",
    "login.code.sent": "{email} manziliga 6 xonali kod yubordik.",
    "login.code.placeholder": "123456",
    "login.code.verify": "Tasdiqlash va kirish",
    "login.code.verifying": "Tekshirilmoqda…",
    "login.code.changeEmail": "Boshqa email ishlatish",
    "login.or": "yoki",
    "login.passkey": "Passkey bilan kirish",
    "login.google": "Google bilan davom etish",
    "login.err.send": "Kodni yuborib bo'lmadi. Manzilni tekshiring va qayta urinib ko'ring.",
    "login.err.code": "Kod noto'g'ri yoki muddati o'tgan.",
    "login.err.passkey":
      "Passkey bilan kirish amalga oshmadi. Qayta urining yoki email'dan foydalaning.",
    "login.err.passkeyCancel": "Passkey bilan kirish bekor qilindi.",
    "profile.title": "Hisobingiz",
    "profile.signin.title": "Qanday kirasiz",
    "profile.email": "Email",
    "profile.unverified": "tasdiqlanmagan",
    "profile.google": "Google",
    "profile.google.link": "Hisobni bog'lash",
    "profile.passkeys": "Passkeys",
    "profile.telegram": "Telegram",
    "profile.telegram.connect": "Bog'lash",
    "profile.telegram.connected": "Bog'langan",
    "profile.telegram.disconnect": "Uzish",
    "profile.telegram.waiting": "Telegram kutilmoqda… botda Start tugmasini bosing.",
    "profile.telegram.linked": "Telegram bog'landi.",
    "profile.telegram.unlinked": "Telegram uzildi.",
    "profile.passkeys.title": "Passkeys",
    "profile.passkeys.add": "Passkey qo'shish",
    "profile.passkeys.adding": "Qo'shilmoqda…",
    "profile.passkeys.none": "Hali passkey yo'q.",
    "profile.passkeys.added": "Passkey qo'shildi.",
    "profile.passkeys.removed": "Passkey o'chirildi.",
    "profile.passkeys.remove": "O'chirish",
    "profile.passkeys.err": "Passkey qo'shib bo'lmadi. Qayta urining.",
    "profile.passkeys.cancel": "Passkey sozlash bekor qilindi.",
    "profile.sessions.title": "Faol seanslar",
    "profile.sessions.others": "Boshqa seanslardan chiqish",
    "profile.sessions.thisDevice": "shu qurilma",
    "profile.sessions.end": "Tugatish",
    "profile.sessions.ended": "Seans tugatildi.",
    "profile.sessions.endedOthers": "Boshqa seanslar tugatildi.",
    "profile.signout": "Chiqish",
    "method.email": "Email",
    "method.passkey": "Passkey",
    "method.google": "Google",
    "time.now": "hozirgina",
    "time.m": "{n} daq oldin",
    "time.h": "{n} soat oldin",
    "time.d": "{n} kun oldin",
  },
  tg: {
    "app.tagline": "Як ҳисоб барои ҳамаи маҳсулоти Outegro.",
    "login.title": "Ворид шудан ба Outegro",
    "login.email.placeholder": "you@example.com",
    "login.email.send": "Фиристодани рамз",
    "login.email.sending": "Фиристода истодааст…",
    "login.code.sent": "Мо ба {email} рамзи 6-рақама фиристодем.",
    "login.code.placeholder": "123456",
    "login.code.verify": "Тасдиқ ва ворид шудан",
    "login.code.verifying": "Санҷида истодааст…",
    "login.code.changeEmail": "Истифодаи email-и дигар",
    "login.or": "ё",
    "login.passkey": "Ворид шудан бо passkey",
    "login.google": "Идома бо Google",
    "login.err.send": "Рамзро фиристода нашуд. Суроғаро санҷед ва бори дигар кӯшиш кунед.",
    "login.err.code": "Рамз нодуруст ё мӯҳлаташ гузаштааст.",
    "login.err.passkey":
      "Ворид шудан бо passkey ноком шуд. Бори дигар кӯшиш кунед ё email-ро истифода баред.",
    "login.err.passkeyCancel": "Ворид шудан бо passkey бекор карда шуд.",
    "profile.title": "Ҳисоби шумо",
    "profile.signin.title": "Чӣ тавр ворид мешавед",
    "profile.email": "Email",
    "profile.unverified": "тасдиқнашуда",
    "profile.google": "Google",
    "profile.google.link": "Пайвасти ҳисоб",
    "profile.passkeys": "Passkeys",
    "profile.telegram": "Telegram",
    "profile.telegram.connect": "Пайваст кардан",
    "profile.telegram.connected": "Пайваст шуд",
    "profile.telegram.disconnect": "Қатъ кардан",
    "profile.telegram.waiting": "Интизори Telegram… дар бот Start-ро пахш кунед.",
    "profile.telegram.linked": "Telegram пайваст шуд.",
    "profile.telegram.unlinked": "Telegram қатъ шуд.",
    "profile.passkeys.title": "Passkeys",
    "profile.passkeys.add": "Илова кардани passkey",
    "profile.passkeys.adding": "Илова шуда истодааст…",
    "profile.passkeys.none": "Ҳоло passkey нест.",
    "profile.passkeys.added": "Passkey илова шуд.",
    "profile.passkeys.removed": "Passkey ҳазф шуд.",
    "profile.passkeys.remove": "Ҳазф",
    "profile.passkeys.err": "Passkey илова нашуд. Бори дигар кӯшиш кунед.",
    "profile.passkeys.cancel": "Танзими passkey бекор шуд.",
    "profile.sessions.title": "Сеансҳои фаъол",
    "profile.sessions.others": "Хуруҷ аз сеансҳои дигар",
    "profile.sessions.thisDevice": "ҳамин дастгоҳ",
    "profile.sessions.end": "Анҷом",
    "profile.sessions.ended": "Сеанс анҷом ёфт.",
    "profile.sessions.endedOthers": "Сеансҳои дигар анҷом ёфтанд.",
    "profile.signout": "Хуруҷ",
    "method.email": "Email",
    "method.passkey": "Passkey",
    "method.google": "Google",
    "time.now": "ҳозир",
    "time.m": "{n} дақ пеш",
    "time.h": "{n} соат пеш",
    "time.d": "{n} рӯз пеш",
  },
  ky: {
    "app.tagline": "Бардык Outegro продукттары үчүн бирдиктүү аккаунт.",
    "login.title": "Outegro'го кирүү",
    "login.email.placeholder": "you@example.com",
    "login.email.send": "Кодду жөнөтүү",
    "login.email.sending": "Жөнөтүлүүдө…",
    "login.code.sent": "{email} дарегине 6 орундуу код жибердик.",
    "login.code.placeholder": "123456",
    "login.code.verify": "Ырастап кирүү",
    "login.code.verifying": "Текшерилүүдө…",
    "login.code.changeEmail": "Башка email колдонуу",
    "login.or": "же",
    "login.passkey": "Passkey менен кирүү",
    "login.google": "Google менен улантуу",
    "login.err.send": "Код жөнөтүлбөдү. Даректи текшерип, кайра аракет кылыңыз.",
    "login.err.code": "Код туура эмес же мөөнөтү бүткөн.",
    "login.err.passkey":
      "Passkey менен кирүү ишке ашкан жок. Кайра аракет кылыңыз же email колдонуңуз.",
    "login.err.passkeyCancel": "Passkey менен кирүү жокко чыгарылды.",
    "profile.title": "Аккаунтуңуз",
    "profile.signin.title": "Кантип киресиз",
    "profile.email": "Email",
    "profile.unverified": "ырасталбаган",
    "profile.google": "Google",
    "profile.google.link": "Аккаунтту байлоо",
    "profile.passkeys": "Passkeys",
    "profile.telegram": "Telegram",
    "profile.telegram.connect": "Туташтыруу",
    "profile.telegram.connected": "Туташты",
    "profile.telegram.disconnect": "Ажыратуу",
    "profile.telegram.waiting": "Telegram күтүлүүдө… ботто Start басыңыз.",
    "profile.telegram.linked": "Telegram туташты.",
    "profile.telegram.unlinked": "Telegram ажыратылды.",
    "profile.passkeys.title": "Passkeys",
    "profile.passkeys.add": "Passkey кошуу",
    "profile.passkeys.adding": "Кошулууда…",
    "profile.passkeys.none": "Азырынча passkey жок.",
    "profile.passkeys.added": "Passkey кошулду.",
    "profile.passkeys.removed": "Passkey өчүрүлдү.",
    "profile.passkeys.remove": "Өчүрүү",
    "profile.passkeys.err": "Passkey кошулбоду. Кайра аракет кылыңыз.",
    "profile.passkeys.cancel": "Passkey тууралоо жокко чыгарылды.",
    "profile.sessions.title": "Активдүү сеанстар",
    "profile.sessions.others": "Башка сеанстардан чыгуу",
    "profile.sessions.thisDevice": "ушул түзмөк",
    "profile.sessions.end": "Аяктоо",
    "profile.sessions.ended": "Сеанс аякталды.",
    "profile.sessions.endedOthers": "Башка сеанстар аякталды.",
    "profile.signout": "Чыгуу",
    "method.email": "Email",
    "method.passkey": "Passkey",
    "method.google": "Google",
    "time.now": "азыр эле",
    "time.m": "{n} мүн мурун",
    "time.h": "{n} саат мурун",
    "time.d": "{n} күн мурун",
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
  const m = document.cookie.match(/(?:^|;\s*)og_locale=(en|ru|uz|tg|ky)/);
  return (m?.[1] as Locale) ?? null;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru");

  // Resolve initial locale on mount: cookie wins, else browser language.
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

  const value = useMemo<I18nvalue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nvalue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
