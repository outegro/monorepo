# auth-web + auth-backend — reference

> Собрано из `outegro/final-docs-outegro/07-auth.md` и `outegro/docs/OUTEGRO.md` §9.2 + §10.1.
> Это не код — это наработки для следующего обсуждения.

## Что это

- **Домены:** `auth.outegro.com` (BFF) + cluster-internal backend.
- **Стек:**
  - `auth-web` — Next 16 standalone, BFF (`app/api/*` — единственная точка токенов).
  - `auth-backend` — Nest 11, выдаёт access JWT (ES256, JWKS), управляет сессиями, консумирует `payment.subscription.changed`.

## Методы входа

1. **Email-code (основной).** Email → одноразовый короткоживущий код → redeem → сессия. Доставка через `notifications-backend` (high-priority path). TTL + лимит попыток + rate-limit per email/IP.
2. **Passkeys (WebAuthn)** через `@simplewebauthn/server` (бэк) + `@simplewebauthn/browser` (фронт). Несколько credentials на юзера, discoverable.
3. **Google (OIDC)** с **account linking**: верифицированный email совпал → линкуется (не дублируется). Линкуется и из настроек. `id_token` верифицируется по JWKS Google (через `jose`).

> Решения к перепроверке: защита от компрометации Google (AUDIT #24 — переспросить пароль/passkey перед линком, логировать `auth.account.linked`); passkeys recovery (AUDIT #25 — max 5, recovery через резервное устройство или email-code).

## Сессии

- Durable **сессия** (`sessions` row + Redis `sessrt:<sid>`).
- Ротирующийся opaque **refresh** в Redis (revocable).
- Короткий stateless **access JWT** (claim `sid`, `entitlements`, `email`, `name`).
- `ACCESS_TTL = 120s` — backstop для остаточного кейса (JWT в обход BFF внутри кластера).
- Все методы → один `startSession`.

## Entitlements (авторизация)

- Юзер может держать несколько подписок, каждая даёт per-service гранты (например, `itmaxxing:pro`).
- Токен несёт текущие entitlements. **`GET /auth/entitlements` авторитетен** (не доверяет старому токену).
- Источник правды — `payment-backend` (consume `payment.subscription.changed`). До payment'а — ручной/admin-грант.

## Auth enforcement & revocation (zero-trust)

- **Каждый `<svc>-backend` верифицирует JWT сам** через `@outegro/auth-client` (stateless, JWKS-cached). Это граница authn; сеть/BFF не доверяем.
- **NetworkPolicy** — второй слой (бэк достижим только от своего BFF).
- **BFF liveness-пречек.** На protected-роутах BFF дёргает `GET /auth/session/alive` → auth проверяет `EXISTS sessrt:<sid>` в Redis → 200/401, **без кэша** (мгновенно).
- **`sessrt:<sid>` — единственный авторитет «жива ли сессия».** `sessions.revoked_at` — для аудита/UI.

> **AUDIT #9**: BFF liveness-пречек через Redis — SPOF. Решение: короткий (1-2с) кэш + circuit breaker. Лучше пускать залогиненных короткое время, чем валить всех.

## SSO

- `auth.outegro.com` ставит httpOnly secure refresh-куку на родительский `.outegro.com` (`__Host-` prefix, `SameSite=Strict` — AUDIT #11).
- Сабдомены молча получают короткий access-токен.
- Wildcard TLS делает фан-аут чистым.

## Эмитит события (через `@outegro/events`)

- `auth.user.created` — при первой регистрации.
- `auth.login.code_requested` — при запросе login-code (notifications консумирует).
- `auth.session.terminated` — при revoke.
- `auth.security.alert` — mandatory (не отключается).

## Потребляет

- `payment.subscription.changed` → обновляет entitlements.

## Данные (своя БД в CNPG)

`sessions` · `users` · `passkey_credentials` · `oauth_accounts` (Google) · `audit_log`

## Что вынести в следующий проход

- **JWT key rotation** (AUDIT #13) — kid rotation, JWKS, расписание.
- **Rate-limit per email/IP** (AUDIT #26) — конкретные цифры (5 рег/час с IP, 3 неудачных кода → CAPTCHA).
- **DB schema** — Prisma 7 schema, миграции, индексы. Структура в общих чертах понятна, детали обсудим.
- **CSRF на важных действиях** (AUDIT #11).
- **GDPR / 152-ФЗ / breach-response** (AUDIT #14).
