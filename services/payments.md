# payments-web + payments-backend — reference

> Собрано из `outegro/final-docs-outegro/13-payment-service.md` и `outegro/docs/OUTEGRO.md` §9.4.
> Это не код — это наработки для следующего обсуждения.
> В доках реализация явно помечена как **«поздняя фаза»**.

## Что это

- **Домен:** `payments.outegro.com` (BFF) + cluster-internal backend.
- **Стек:**
  - `payments-web` — Next 16 standalone, BFF (чекаут, история, методы, инвойсы, подписки).
  - `payments-backend` — Nest 11, единый авторитет по деньгам и подпискам.

## Ответственность

- **Приём оплат** — чекаут через провайдеров.
- **История транзакций** — все платежи/возвраты, статусы.
- **Привязанные методы оплаты** — сохранённые карты/кошельки (через токены провайдера, **не PAN у нас**).
- **Инвойсы** — генерация/хранение/выдача.
- **Подписки** — план, статус, продление/отмена. **Источник правды** по подпискам.

## Мульти-провайдер

Три провайдера за **одним внутренним интерфейсом** (выбор по региону/валюте/способу):

| Провайдер | Назначение | Статус |
|-----------|-----------|--------|
| **Paddle** | зарубежные карты (merchant of record — берёт на себя налоги/VAT) | ❌ отложено в MVP |
| **Prodamus** | российские платежи | ❌ отложено в MVP |
| **NOWPayments** | крипто | ❌ отложено в MVP |

> В MVP — **только интерфейс + стабы**. Реальные адаптеры подключаем по мере надобности (AUDIT #28: реальные платежи — месяц-два разработки, нужен ledger, refunds, chargebacks, инвойсы, сверка, налоги, KYC, fallback).

## Связь с auth

- **Payment — источник правды по подпискам.**
- Эмитит `payment.subscription.changed` → auth обновляет **entitlements**.
- Auth не хранит платёжное состояние, только гранты.

> AUDIT #17, #79: каноничное имя события — `payment.subscription.changed` (а не `created|updated|canceled`). Уже в коде `@outegro/events`.

## Wiring

- **Своя БД** (CNPG, db-per-service): `customers` ↔ provider-id, `transactions`, `invoices`, `subscriptions`, `processed_webhooks` (event_id UNIQUE, TTL 30d — AUDIT #29).
- **Верификация вебхуков** каждого провайдера (подпись) — единственный достоверный источник статуса.
- JWT-guard через `@outegro/auth-client` (entitlements — для admin-операций).
- Секреты (sealed): API-ключи + webhook-секреты провайдеров.
- 2 реплики + RollingUpdate; **idempotency на вебхуках** (дедуп ретраев провайдера).

## Потребляет

- Ничего публично. Внутренне — может ходить в auth за профилем юзера (`GET /auth/session/alive`).

## Эмитит

- `payment.subscription.changed` — на любое изменение подписки (created/updated/canceled/trialing/past_due/active). Один routing key, разные `status` в payload.

## Данные (своя БД в CNPG)

`customers` · `payment_methods` · `transactions` · `invoices` · `subscriptions` · `processed_webhooks`

## Что вынести в следующий проход

- **Ledger** (AUDIT #28) — double-entry обязателен, иначе через год не разберётесь.
- **Refund/chargeback flow** — конкретный сценарий.
- **Reconciliation** — ежедневная сверка с провайдером.
- **Webhook dedup** (AUDIT #29) — таблица `processed_webhooks` с UNIQUE(event_id).
- **Tax / KYC** — Paddle MoR / Prodamus сами / крипта KYC.
- **Manual entitlements source** (AUDIT #22 in old docs) — пока payment не работает, ручной/admin-грант через API.
- **Связь с auth entitlements** — API для admin-grant (AUDIT #17 mentioned in old docs).
