# notifications-backend — reference

> Собрано из `outegro/final-docs-outegro/08-notifications.md` и `outegro/docs/OUTEGRO.md` §9.3.
> Это не код — это наработки для следующего обсуждения.

## Что это

- **Домен:** cluster-internal (не публичный).
- **Стек:** Nest 11, консумирует RabbitMQ, шлёт через Resend (email-only на MVP).
- **Принцип:** другие сервисы **никогда** не дёргают email-провайдера напрямую — только публикуют событие/запрос. Это единственная точка интеграции с провайдером.

## Поведение

- **Consume RabbitMQ** `notify.requested` + отдельный **high-priority** путь для login-кодов (не стоят за массовыми рассылками).
- **Матрица preferences** *(тип нотификации × канал)* — юзер может отключить тип/ограничить канал.
- **Mandatory-типы.** Security/transactional (login-код, session-alert) **игнорируют opt-out** и шлются всегда.
- **Delivery-log + idempotency** (idempotency-key дедуплицирует ретраи); **ретраи через RabbitMQ DLX** с backoff.

## Каналы (на MVP — только email)

| Канал | Провайдер | Статус |
|-------|-----------|--------|
| Email | Resend | ✅ в MVP |
| Telegram | Bot API | ❌ отложено (требовался в старых доках, не в твоём списке) |
| SMS / Push | — | ❌ вне скоупа |

> Интерфейс канала уже отделён (один адаптер = один файл). Добавить канал = реализовать адаптер интерфейса, не трогая отправителей.
> **AUDIT #41**: Resend — SPOF. MVP принимает, fallback-провайдер (SES/Postmark) запланировать.

## Контракт

`NotifyRequest { userId|recipient, type, channels?, template, data, idempotencyKey }` — в `@outegro/contracts` (Zod). HTML-шаблоны экранируют интерполяции (anti-injection).

## Потребляет

- `auth.login.code_requested` (high-priority) → отправить email с кодом.
- `auth.user.created` → welcome.
- `auth.security.alert` (mandatory) → отправить всегда.
- `auth.session.terminated` (security) → отправить всегда.
- `notify.requested` (произвольный) → любой сервис может попросить.

## Эмитит

Ничего. Чисто consumer.

## Данные (своя БД в CNPG)

`notification_preferences` · `delivery_log` (с `idempotency_key` UNIQUE) · `templates` (опционально, можно держать в коде)

## Что вынести в следующий проход

- **SPF/DKIM/DMARC** для `outegro.com` (AUDIT #42) — без DMARC почтовые серверы не доверяют.
- **Webhook от Resend** на notifications для bounce/complaint → автоматическое отключение адреса.
- **Telegram provider** (если вернётся в скоуп) — отдельный адаптер.
- **Templates** — render engine (handlebars? react-email? шаблоны в репо?).
- **GDPR / data retention** (AUDIT #14) — сколько храним delivery log.
