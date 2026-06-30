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
 * Client i18n for the Korean-learning UI — flat typed dictionary + cookie-persisted switcher.
 * Languages: Russian, English, Uzbek (Latin), Tajik (Cyrillic), Kyrgyz (Cyrillic).
 * `{x}` placeholders are interpolated by `t(key, vars)`.
 */
const dict = {
  en: {
    "nav.courses": "Courses",
    "nav.vocab": "Vocabulary",
    "nav.admin": "Admin",
    "gate.tagline": "Learn Korean: lessons, AI homework checks, vocabulary and a trainer.",
    "gate.signin": "Sign in with Outegro ID",
    "common.loading": "Loading…",
    "courses.title": "Korean courses",
    "courses.empty": "Courses coming soon.",
    "course.back": "All courses",
    "course.draft": "draft",
    "chapter.material": "Lesson material",
    "chapter.vocab": "Lesson vocabulary",
    "chapter.vocab.add": "+ to my vocabulary",
    "chapter.vocab.added": "Words added to your vocabulary",
    "chapter.vocab.addErr": "Could not add",
    "chapter.mock": "Mini-test",
    "chapter.check": "Check",
    "chapter.result": "Result",
    "chapter.quiz.title": "Trainer (a fresh variant each time)",
    "chapter.quiz.start": "Start",
    "chapter.quiz.more": "Another variant",
    "chapter.quiz.err": "Could not generate the trainer",
    "chapter.quiz.stale": "Trainer expired — generate a new one",
    "chapter.hw.title": "Homework",
    "chapter.hw.placeholder": "Your answer…",
    "chapter.hw.submit": "Check with AI",
    "chapter.hw.err": "Could not check the homework",
    "chapter.hw.score": "Score",
    "chapter.ask.title": "Ask AI about the lesson",
    "chapter.ask.placeholder": "Your question about the lesson…",
    "chapter.ask.btn": "Ask",
    "chapter.ask.err": "AI unavailable",
    "chapter.complete": "Complete lesson",
    "chapter.completed": "✓ Lesson done",
    "chapter.complete.toast": "Lesson done — the next one is unlocked",
    "chapter.complete.err": "Could not mark as done",
    "vocab.title": "My vocabulary",
    "vocab.hint": "Tap a card to flip it. Add words from lessons.",
    "vocab.empty": "Vocabulary is empty. Add words from lessons.",
    "vocab.delete": "delete",
    "vocab.deleted": "Deleted",
    "admin.title": "Admin — lessons",
    "admin.needAdmin": "Administrator rights required.",
    "admin.course": "Course:",
    "admin.chapters": "Chapters",
    "admin.newChapter": "+ New chapter",
    "admin.edit": "edit",
    "admin.editing": "Editing chapter",
    "admin.new": "New chapter",
    "admin.newLesson": "New lesson",
    "admin.f.title": "Title",
    "admin.f.order": "Order",
    "admin.f.material": "Material (markdown)",
    "admin.f.homework": "Homework",
    "admin.f.vocab": "Vocabulary (JSON: [{ko,ru,romanization}])",
    "admin.f.test": "Mini-test (JSON: [{question,options,answerIndex}])",
    "admin.save": "Save",
    "admin.cancel": "Cancel",
    "admin.delete": "Delete chapter",
    "admin.saved": "Saved",
    "admin.created": "Chapter created",
    "admin.deleted": "Deleted",
    "admin.saveErr": "Save error",
    "admin.delErr": "Could not delete",
    "admin.jsonErr": "Invalid JSON in vocabulary or test",
  },
  ru: {
    "nav.courses": "Курсы",
    "nav.vocab": "Словарь",
    "nav.admin": "Админка",
    "gate.tagline": "Изучайте корейский: уроки, AI-проверка домашних заданий, словарь и тренажёр.",
    "gate.signin": "Войти через Outegro ID",
    "common.loading": "Загрузка…",
    "courses.title": "Курсы корейского",
    "courses.empty": "Курсы скоро появятся.",
    "course.back": "Все курсы",
    "course.draft": "черновик",
    "chapter.material": "Материал урока",
    "chapter.vocab": "Словарь урока",
    "chapter.vocab.add": "+ в мой словарь",
    "chapter.vocab.added": "Слова добавлены в словарь",
    "chapter.vocab.addErr": "Не удалось добавить",
    "chapter.mock": "Мини-тест",
    "chapter.check": "Проверить",
    "chapter.result": "Результат",
    "chapter.quiz.title": "Тренажёр (новый вариант каждый раз)",
    "chapter.quiz.start": "Запустить",
    "chapter.quiz.more": "Ещё вариант",
    "chapter.quiz.err": "Не удалось сгенерировать тренажёр",
    "chapter.quiz.stale": "Тренажёр устарел — сгенерируйте заново",
    "chapter.hw.title": "Домашнее задание",
    "chapter.hw.placeholder": "Ваш ответ…",
    "chapter.hw.submit": "Проверить с AI",
    "chapter.hw.err": "Не удалось проверить ДЗ",
    "chapter.hw.score": "Оценка",
    "chapter.ask.title": "Спросить AI по уроку",
    "chapter.ask.placeholder": "Ваш вопрос по теме урока…",
    "chapter.ask.btn": "Спросить",
    "chapter.ask.err": "AI недоступен",
    "chapter.complete": "Завершить урок",
    "chapter.completed": "✓ Урок пройден",
    "chapter.complete.toast": "Урок пройден — следующий открыт",
    "chapter.complete.err": "Не удалось отметить",
    "vocab.title": "Мой словарь",
    "vocab.hint": "Нажмите на карточку, чтобы перевернуть. Добавляйте слова из уроков.",
    "vocab.empty": "Словарь пуст. Добавьте слова из уроков.",
    "vocab.delete": "удалить",
    "vocab.deleted": "Удалено",
    "admin.title": "Админка — уроки",
    "admin.needAdmin": "Нужны права администратора.",
    "admin.course": "Курс:",
    "admin.chapters": "Главы",
    "admin.newChapter": "+ Новая глава",
    "admin.edit": "редактировать",
    "admin.editing": "Редактирование главы",
    "admin.new": "Новая глава",
    "admin.newLesson": "Новый урок",
    "admin.f.title": "Название",
    "admin.f.order": "Порядок",
    "admin.f.material": "Материал (markdown)",
    "admin.f.homework": "Домашнее задание",
    "admin.f.vocab": "Словарь (JSON: [{ko,ru,romanization}])",
    "admin.f.test": "Мини-тест (JSON: [{question,options,answerIndex}])",
    "admin.save": "Сохранить",
    "admin.cancel": "Отмена",
    "admin.delete": "Удалить главу",
    "admin.saved": "Сохранено",
    "admin.created": "Глава создана",
    "admin.deleted": "Удалено",
    "admin.saveErr": "Ошибка сохранения",
    "admin.delErr": "Не удалось удалить",
    "admin.jsonErr": "Неверный JSON в словаре или тесте",
  },
  uz: {
    "nav.courses": "Kurslar",
    "nav.vocab": "Lug'at",
    "nav.admin": "Admin",
    "gate.tagline":
      "Koreys tilini o'rganing: darslar, uy vazifasini AI tekshiruvi, lug'at va trenajyor.",
    "gate.signin": "Outegro ID bilan kirish",
    "common.loading": "Yuklanmoqda…",
    "courses.title": "Koreys tili kurslari",
    "courses.empty": "Kurslar tez orada paydo bo'ladi.",
    "course.back": "Barcha kurslar",
    "course.draft": "qoralama",
    "chapter.material": "Dars materiali",
    "chapter.vocab": "Dars lug'ati",
    "chapter.vocab.add": "+ lug'atimga",
    "chapter.vocab.added": "So'zlar lug'atga qo'shildi",
    "chapter.vocab.addErr": "Qo'shib bo'lmadi",
    "chapter.mock": "Mini-test",
    "chapter.check": "Tekshirish",
    "chapter.result": "Natija",
    "chapter.quiz.title": "Trenajyor (har safar yangi variant)",
    "chapter.quiz.start": "Boshlash",
    "chapter.quiz.more": "Yana variant",
    "chapter.quiz.err": "Trenajyorni yaratib bo'lmadi",
    "chapter.quiz.stale": "Trenajyor eskirdi — qaytadan yarating",
    "chapter.hw.title": "Uy vazifasi",
    "chapter.hw.placeholder": "Javobingiz…",
    "chapter.hw.submit": "AI bilan tekshirish",
    "chapter.hw.err": "Uy vazifasini tekshirib bo'lmadi",
    "chapter.hw.score": "Baho",
    "chapter.ask.title": "Dars bo'yicha AI'dan so'rang",
    "chapter.ask.placeholder": "Dars mavzusi bo'yicha savolingiz…",
    "chapter.ask.btn": "So'rash",
    "chapter.ask.err": "AI mavjud emas",
    "chapter.complete": "Darsni yakunlash",
    "chapter.completed": "✓ Dars o'tildi",
    "chapter.complete.toast": "Dars o'tildi — keyingisi ochildi",
    "chapter.complete.err": "Belgilab bo'lmadi",
    "vocab.title": "Mening lug'atim",
    "vocab.hint": "Aylantirish uchun kartani bosing. Darslardan so'z qo'shing.",
    "vocab.empty": "Lug'at bo'sh. Darslardan so'z qo'shing.",
    "vocab.delete": "o'chirish",
    "vocab.deleted": "O'chirildi",
    "admin.title": "Admin — darslar",
    "admin.needAdmin": "Administrator huquqlari kerak.",
    "admin.course": "Kurs:",
    "admin.chapters": "Boblar",
    "admin.newChapter": "+ Yangi bob",
    "admin.edit": "tahrirlash",
    "admin.editing": "Bobni tahrirlash",
    "admin.new": "Yangi bob",
    "admin.newLesson": "Yangi dars",
    "admin.f.title": "Sarlavha",
    "admin.f.order": "Tartib",
    "admin.f.material": "Material (markdown)",
    "admin.f.homework": "Uy vazifasi",
    "admin.f.vocab": "Lug'at (JSON: [{ko,ru,romanization}])",
    "admin.f.test": "Mini-test (JSON: [{question,options,answerIndex}])",
    "admin.save": "Saqlash",
    "admin.cancel": "Bekor qilish",
    "admin.delete": "Bobni o'chirish",
    "admin.saved": "Saqlandi",
    "admin.created": "Bob yaratildi",
    "admin.deleted": "O'chirildi",
    "admin.saveErr": "Saqlash xatosi",
    "admin.delErr": "O'chirib bo'lmadi",
    "admin.jsonErr": "Lug'at yoki testda noto'g'ri JSON",
  },
  tg: {
    "nav.courses": "Курсҳо",
    "nav.vocab": "Луғат",
    "nav.admin": "Админ",
    "gate.tagline":
      "Забони кореягиро омӯзед: дарсҳо, санҷиши вазифаи хонагӣ бо AI, луғат ва тренажёр.",
    "gate.signin": "Ворид шудан бо Outegro ID",
    "common.loading": "Боргузорӣ…",
    "courses.title": "Курсҳои забони кореягӣ",
    "courses.empty": "Курсҳо ба зудӣ пайдо мешаванд.",
    "course.back": "Ҳамаи курсҳо",
    "course.draft": "сиёҳнавис",
    "chapter.material": "Маводи дарс",
    "chapter.vocab": "Луғати дарс",
    "chapter.vocab.add": "+ ба луғати ман",
    "chapter.vocab.added": "Калимаҳо ба луғат илова шуданд",
    "chapter.vocab.addErr": "Илова нашуд",
    "chapter.mock": "Мини-тест",
    "chapter.check": "Санҷидан",
    "chapter.result": "Натиҷа",
    "chapter.quiz.title": "Тренажёр (ҳар бор варианти нав)",
    "chapter.quiz.start": "Оғоз",
    "chapter.quiz.more": "Варианти дигар",
    "chapter.quiz.err": "Тренажёр сохта нашуд",
    "chapter.quiz.stale": "Тренажёр кӯҳна шуд — аз нав созед",
    "chapter.hw.title": "Вазифаи хонагӣ",
    "chapter.hw.placeholder": "Ҷавоби шумо…",
    "chapter.hw.submit": "Санҷиш бо AI",
    "chapter.hw.err": "Вазифаро санҷида нашуд",
    "chapter.hw.score": "Баҳо",
    "chapter.ask.title": "Аз AI оид ба дарс пурсед",
    "chapter.ask.placeholder": "Саволи шумо оид ба мавзӯи дарс…",
    "chapter.ask.btn": "Пурсидан",
    "chapter.ask.err": "AI дастрас нест",
    "chapter.complete": "Анҷоми дарс",
    "chapter.completed": "✓ Дарс гузашт",
    "chapter.complete.toast": "Дарс гузашт — дарси оянда кушода шуд",
    "chapter.complete.err": "Қайд карда нашуд",
    "vocab.title": "Луғати ман",
    "vocab.hint": "Барои гардондан корт-ро пахш кунед. Аз дарсҳо калима илова кунед.",
    "vocab.empty": "Луғат холӣ аст. Аз дарсҳо калима илова кунед.",
    "vocab.delete": "ҳазф",
    "vocab.deleted": "Ҳазф шуд",
    "admin.title": "Админ — дарсҳо",
    "admin.needAdmin": "Ҳуқуқи администратор лозим аст.",
    "admin.course": "Курс:",
    "admin.chapters": "Бобҳо",
    "admin.newChapter": "+ Боби нав",
    "admin.edit": "таҳрир",
    "admin.editing": "Таҳрири боб",
    "admin.new": "Боби нав",
    "admin.newLesson": "Дарси нав",
    "admin.f.title": "Сарлавҳа",
    "admin.f.order": "Тартиб",
    "admin.f.material": "Мавод (markdown)",
    "admin.f.homework": "Вазифаи хонагӣ",
    "admin.f.vocab": "Луғат (JSON: [{ko,ru,romanization}])",
    "admin.f.test": "Мини-тест (JSON: [{question,options,answerIndex}])",
    "admin.save": "Захира",
    "admin.cancel": "Бекор",
    "admin.delete": "Ҳазфи боб",
    "admin.saved": "Захира шуд",
    "admin.created": "Боб сохта шуд",
    "admin.deleted": "Ҳазф шуд",
    "admin.saveErr": "Хатои захира",
    "admin.delErr": "Ҳазф нашуд",
    "admin.jsonErr": "JSON-и нодуруст дар луғат ё тест",
  },
  ky: {
    "nav.courses": "Курстар",
    "nav.vocab": "Сөздүк",
    "nav.admin": "Админ",
    "gate.tagline":
      "Корей тилин үйрөнүңүз: сабактар, үй тапшырмасын AI текшерүү, сөздүк жана машыктыргыч.",
    "gate.signin": "Outegro ID менен кирүү",
    "common.loading": "Жүктөлүүдө…",
    "courses.title": "Корей тили курстары",
    "courses.empty": "Курстар жакында пайда болот.",
    "course.back": "Бардык курстар",
    "course.draft": "долбоор",
    "chapter.material": "Сабактын материалы",
    "chapter.vocab": "Сабактын сөздүгү",
    "chapter.vocab.add": "+ менин сөздүгүмө",
    "chapter.vocab.added": "Сөздөр сөздүккө кошулду",
    "chapter.vocab.addErr": "Кошулбоду",
    "chapter.mock": "Мини-тест",
    "chapter.check": "Текшерүү",
    "chapter.result": "Жыйынтык",
    "chapter.quiz.title": "Машыктыргыч (ар жолу жаңы вариант)",
    "chapter.quiz.start": "Баштоо",
    "chapter.quiz.more": "Дагы вариант",
    "chapter.quiz.err": "Машыктыргыч түзүлбөдү",
    "chapter.quiz.stale": "Машыктыргыч эскирди — кайра түзүңүз",
    "chapter.hw.title": "Үй тапшырмасы",
    "chapter.hw.placeholder": "Жообуңуз…",
    "chapter.hw.submit": "AI менен текшерүү",
    "chapter.hw.err": "Тапшырманы текшерүү болбоду",
    "chapter.hw.score": "Баа",
    "chapter.ask.title": "Сабак боюнча AI'дан сураңыз",
    "chapter.ask.placeholder": "Сабак боюнча сурооңуз…",
    "chapter.ask.btn": "Суроо",
    "chapter.ask.err": "AI жеткиликсиз",
    "chapter.complete": "Сабакты аяктоо",
    "chapter.completed": "✓ Сабак өттү",
    "chapter.complete.toast": "Сабак өттү — кийинкиси ачылды",
    "chapter.complete.err": "Белгилөө болбоду",
    "vocab.title": "Менин сөздүгүм",
    "vocab.hint": "Картаны айландыруу үчүн басыңыз. Сабактардан сөз кошуңуз.",
    "vocab.empty": "Сөздүк бош. Сабактардан сөз кошуңуз.",
    "vocab.delete": "өчүрүү",
    "vocab.deleted": "Өчүрүлдү",
    "admin.title": "Админ — сабактар",
    "admin.needAdmin": "Администратор укуктары керек.",
    "admin.course": "Курс:",
    "admin.chapters": "Главалар",
    "admin.newChapter": "+ Жаңы глава",
    "admin.edit": "түзөтүү",
    "admin.editing": "Главаны түзөтүү",
    "admin.new": "Жаңы глава",
    "admin.newLesson": "Жаңы сабак",
    "admin.f.title": "Аталышы",
    "admin.f.order": "Тартиби",
    "admin.f.material": "Материал (markdown)",
    "admin.f.homework": "Үй тапшырмасы",
    "admin.f.vocab": "Сөздүк (JSON: [{ko,ru,romanization}])",
    "admin.f.test": "Мини-тест (JSON: [{question,options,answerIndex}])",
    "admin.save": "Сактоо",
    "admin.cancel": "Жокко чыгаруу",
    "admin.delete": "Главаны өчүрүү",
    "admin.saved": "Сакталды",
    "admin.created": "Глава түзүлдү",
    "admin.deleted": "Өчүрүлдү",
    "admin.saveErr": "Сактоо катасы",
    "admin.delErr": "Өчүрүлбөдү",
    "admin.jsonErr": "Сөздүктө же тестте туура эмес JSON",
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
