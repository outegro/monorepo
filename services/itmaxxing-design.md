# itmaxxing — дизайн (Phase 7, первый сабсервис)

> Статус: **дизайн-док + наброски**. itmaxxing = job-hunt copilot. Это первый экземпляр
> «шаблона сабсервиса» — наследует zero-trust+entitlement-guard, BFF, CSRF, deep-readiness,
> NetworkPolicy, свою CNPG-БД, миграции, события. Гейт по `itmaxxing:free|pro`.

## 1. Что это (из брифа)

Ассистент поиска работы. Семь модулей:

1. **Прокачка LinkedIn** — чеклист «что заполнить»; к каждому пункту: (a) справка как сделать,
   (b) проверка-верификация «сделано?».
2. **Резюме** — онлайн-конструктор по **LaTeX-шаблону** → PDF.
3. **Источники вакансий** — актуальные сурсы (курируемый список/агрегатор).
4. **CRM откликов** — хендлинг всех откликов как CRM (воронка стадий, заметки, фоллоу-апы).
5. **Goals** — цели (напр. N откликов/нед), трекинг прогресса.
6. **Пре-чеклист подачи** — что сделать перед откликом.
7. **Рабочий «лор»** — структурированная база твоего опыта, **из которой генерим буллеты,
   резюме и прочее** (через LLM). Центральный актив — питает #2 и тейлоринг под вакансию.

## 2. Архитектура «лор → генерация» (ядро ценности)

```
work-lore (структурированный опыт)  ──LLM──▶  буллеты / секции резюме / cover letter / summary
   roles · projects · achievements · skills          ▲
   education · raw notes                              │ тейлоринг под конкретную вакансию (#3/#4)
```
### 2.1 Онбординг — интейк лора (ядро v1, делать «идеально»)

Главный первый экран. Двухшаговый:

**Шаг 1 — freeform brain-dump.** Юзер одним текстом описывает весь свой лор (опыт, проекты,
учёба, чем занимался) — без формы, как пишется. Жмёт **Submit**.

**Шаг 2 — LLM-проход (сразу после submit), сплит-вью:**
- **слева** — его исходный текст; **справа** — улучшенная/дополненная версия (что подкорректировали,
  что придумали, что звучит сильнее) с подсветкой изменений;
- **🚩 ред-флаги сразу** — пробелы (нет метрик/цифр, размытые формулировки, дыры в датах, слабые
  глаголы, нерелевантное) подсвечиваются с пояснением «почему» и подсказкой как починить;
- юзер принимает/правит предложения (accept/edit per-блок).

**Шаг 3 — структуризация.** Следующим шагом LLM раскладывает принятый текст в **структурированный
вид**: `education · experience · projects · skills/tech · achievements` (→ заполняет `lore_entries`).
Юзер докручивает поля. Это и становится каноничным лором, из которого дальше генерим всё (буллеты,
резюме, cover letters, тейлоринг).

> Принцип: интейк должен быть «вау» — человек вываливает сырой текст и за один проход получает
> улучшенную, структурированную, отревьюенную версию себя. Это крючок продукта.

Реализация: `generations` хранит каждый проход (вход/выход/diff/ред-флаги) для кэша и повторов;
сплит-diff и ред-флаги — структурированный JSON-ответ LLM (не сырой текст), чтобы UI рендерил
по-блочно. Стоимость/лимиты — pro-гейт + rate-limit.

### 2.2 Сущности лора

- **`lore_entries`** — единый источник: тип (`role|project|achievement|skill|education|note`),
  заголовок, организация, даты, тело, метрики (числа!), теги.
- Генерация: `generations` хранит вход/выход/модель (кэш + аудит). LLM через провайдер-абстракцию
  (env намекает на MiniMax; держим порт `LlmProvider` → MiniMax/Claude). ATS-оптимизация буллетов,
  тейлоринг под текст вакансии. Pro-гейт + rate-limit (дорого).
- **Резюме** = выбранные `lore_entries` + шаблон → LaTeX-исходник → PDF (рендер LaTeX в Job/функции
  или managed-сервисе). Несколько резюме под разные роли.

## 3. Модель данных (своя БД `itmaxxing` в CNPG — добавить роль+Database)

```
profiles(userId UNIQUE, headline, targetRole, locale, createdAt)
lore_entries(id, userId, type, title, org, startDate, endDate, body, metrics jsonb, tags text[])
resumes(id, userId, name, templateKey, contentJson, latexSource, pdfUrl, updatedAt)
applications(id, userId, company, role, sourceUrl, stage, appliedAt, notes, vacancyId?)   -- CRM
application_events(id, applicationId, type[stage_change|note|followup_due], at, note)      -- таймлайн
saved_vacancies(id, userId, url, title, company, parsedJson, savedAt)
vacancy_sources(id, name, url, region, tags)                       -- курируемый каталог (сид)
goals(id, userId, type[applications|interviews|...], target, period, progress, startedAt)
checklist_catalog(itemKey, area[linkedin|pre_apply], title, guide, checkType)  -- статич. сид
checklist_progress(userId, itemKey, status, verifiedAt)            -- прогресс по чеклисту
generations(id, userId, kind[bullet|cover_letter|summary|resume], input, output, model, createdAt)
outbox(...)                                                        -- события (напоминания)
```
- **CRM-воронка** (`applications.stage`): `saved → applied → screening → interview → offer | rejected`.
- **Чеклисты** (#1 LinkedIn, #6 pre-apply): статический `checklist_catalog` (title+guide+тип
  проверки) + per-user `checklist_progress`. «Проверка» #1b — от ручной отметки до авто-проверки
  (напр. по публичному LinkedIn-URL) поздним проходом.

## 4. Тиры (entitlements) — стыковка с payments

| Возможность | `itmaxxing:free` | `itmaxxing:pro` |
|---|---|---|
| Чеклисты LinkedIn/pre-apply | ✅ | ✅ |
| CRM откликов | базово | расширенно (фоллоу-апы, напоминания) |
| Резюме | 1, без LaTeX-экспорта | много + LaTeX/PDF |
| LLM-генерация (буллеты/cover) | лимит/мес | без лимита (rate-limited) |
| Агрегация вакансий | ссылки на сурсы | парсинг/сохранение/тейлоринг |
| Goals | ✅ | ✅ + аналитика |

- `itmaxxing:pro` уже есть тестовым грантом на founder-аккаунте. До payments выдаём вручную
  (admin-grant); с Ch9 — через подписку/super-план.

## 5. Стыковка с платформой

- **BFF** `itmaxxing.outegro.com` (или `app.outegro.com`) — браузер только в `app/api/*`;
  backend ClusterIP-only. Гейт: `@outegro/auth-client` JWKS-verify + требование `itmaxxing:*` +
  liveness-пречек (как разобрано в Phase 6.6).
- **Своя БД** `itmaxxing` (+ login-роль) — добавить в `cnpg-cluster.yaml`; миграции k8s-Job.
- **Напоминания** (фоллоу-ап по отклику, нудж по goal) → публикуем `notify.requested`
  (email/telegram) через notifications — переиспользуем готовый канал. itmaxxing эмитит свои
  доменные события через outbox.
- **LLM-секреты** sealed; модель в env — ровно та, что обслуживает ключ (правило из CLAUDE.md).

## 6. Порядок реализации (Phase 7, тонкими срезами)

1. Скаффолд `itmaxxing-backend`+`-frontend` из шаблона (entitlement-guard, BFF, БД, миграции,
   deep-health, NetworkPolicy, publisher) — **это и есть «шаблон сабсервиса»**.
2. **Интейк лора (§2.1)** — freeform → LLM improve+redflags (сплит-вью) → структуризация в
   `lore_entries`. **Ядро v1 и крючок продукта** (выбрано как старт).
3. Генерация из лора: буллеты / резюме-секции / cover letter (#7→#2).
4. CRM откликов (#4) + goals (#5).
5. Чеклисты LinkedIn/pre-apply (#1/#6) — статический каталог + прогресс.
6. Резюме→LaTeX→PDF (#2).
7. Источники/сохранение вакансий (#3) + тейлоринг.
8. Напоминания через notifications.

## 7. Открытые вопросы

1. **LLM-провайдер/модель** — MiniMax (есть в env) vs Claude? Влияет на качество генерации/цену.
2. **LaTeX-рендер** — где (in-cluster Job с texlive vs внешний сервис)? texlive-образ тяжёлый.
3. **Источники вакансий** — курируемый список (быстро) vs агрегатор/парсер (долго, правовые нюансы).
4. **«Проверка» пунктов LinkedIn** — ручная отметка vs авто-проверка по URL (скоуп растёт).
5. **Домен** — `itmaxxing.outegro.com` vs `app.outegro.com` (если itmaxxing = флагман).
