# admin — дизайн (роль + отдельная админка)

> Статус: **дизайн-док**. Отдельная админ-поверхность + роль админа. Переиспользует
> entitlement-модель auth (без новой системы ролей).

## 1. Роль админа = entitlement (не отдельная система)

- Админ — это просто entitlement **`(outegro, admin)`** → в JWT прилетает `roles: ["outegro:admin"]`.
  `service="outegro"` — «платформенный» псевдосервис для кросс-сервисных ролей.
- Уровни при желании: `outegro:admin` (операции) и `outegro:superadmin` (управление каталогом/
  выдача admin другим). MVP — один `outegro:admin`.
- **Бутстрап:** первый админ заводится существующим механизмом — `POST /admin/entitlements`
  (auth, под `ADMIN_API_KEY`, sealed) с `source=manual`, либо сид-миграцией на founder-аккаунт
  (`lukashik.work@gmail.com`). Дальше superadmin может выдавать `outegro:admin` через UI.
- `source=manual` → payments-реконсиляция (§2 payments-design) его НЕ трогает. Не истекает.

## 2. Поверхность: отдельный app `admin-web` на `admin.outegro.com`

- Next 16 standalone BFF, как id-web/pay-web. **Вход — через Outegro ID SSO** (общий refresh-cookie
  на `.outegro.com` + JWKS). Юзер логинится на `id.outegro.com`, получает `outegro:admin`, идёт на
  `admin.outegro.com`.
- **Гейт в BFF:** на каждом запросе admin-web проверяет, что access-токен содержит `outegro:admin`
  (+ liveness-пречек, как у сабсервисов). Нет роли → 403, редирект на id-login.
- **Defense-in-depth на эдже:** `admin.outegro.com` за **Cloudflare Access** (как нынешние
  дашборды grafana/argocd) — второй независимый барьер до того, как запрос вообще дойдёт до кластера.
- **NetworkPolicy:** admin-web → может ходить в auth/payments/notifications backends; backends
  принимают его как обычный platform-под.

## 3. Авторизация бэкендов: токен админа несёт роль

- admin-web BFF проксирует запросы в backends **с bearer-токеном самого админа** (не сервисным
  ключом). Каждый backend выставляет `/admin/*` под guard'ом `@outegro/auth-client`, который
  требует роль **`outegro:admin`** в токене. Так авторизация централизована в auth-роли, а не
  размазана по internal-ключам.
- Сервис-к-сервису (без юзер-контекста) по-прежнему через `X-Internal-Key`. Админ-операции (есть
  юзер-контекст = сам админ) — через его JWT-роль. Все админ-действия пишутся в **audit_log**.

## 4. Возможности (MVP → дальше)

| Область | MVP | Позже |
|---|---|---|
| **Пользователи** | поиск, профиль, сессии, identities, entitlements (read) | impersonation (с аудитом) |
| **Entitlements** | ручная выдача/отзыв `source=manual` (комп-аккаунты, саппорт) | bulk, шаблоны |
| **Подписки/платежи** | просмотр подписок и transactions юзера (из payments) | refund, отмена, комп-план |
| **Каталог** | — (сидим планы миграцией) | CRUD products/plans/grants/prices из UI |
| **Нотификации** | — | resend, просмотр delivery_log |
| **Аудит** | лог всех админ-действий | фильтры/экспорт |
| **Метрики** | ссылки на Grafana | встроенные дашборды (MRR, churn) |

## 5. Данные

- **Без своей БД на старте.** admin-web — чистый BFF-агрегатор над auth/payments/notifications
  `/admin/*`-эндпоинтами.
- **`audit_log`** — где жить: предлагаю в **auth** (он владеет идентичностью/правами и уже
  потребляется), таблица `admin_audit(id, actorUserId, action, targetUserId?, payload, ip, at)`.
  Каждый backend, выполняя админ-действие, пишет свою запись или эмитит `auth.admin.action` —
  предлагаю **прямую запись в auth.admin_audit через internal-эндпоинт** (проще, один журнал).

## 6. Что добавить в платформу

- Новый app `admin-web` (+ ingress `admin.outegro.com`, CF Access-приложение).
- В каждом backend: `/admin/*` под guard `requireRole("outegro:admin")` (расширить
  `@outegro/auth-client` — добавить role-check guard поверх JWKS-verify).
- auth: таблица `admin_audit` + internal-эндпоинт записи; сид `outegro:admin` на founder.
- Гейт-хелпер в BFF (как liveness-пречек) — переиспользуемый для admin-web и сабсервисов.

## 7. Решения к подтверждению

1. **Один уровень (`outegro:admin`) или + `superadmin`?** Предлагаю начать с одного.
2. **CF Access на `admin.outegro.com`** — да/нет (рекомендую да, как у дашбордов).
3. **Audit log в auth** (один журнал) vs per-service. Предлагаю **в auth**.
