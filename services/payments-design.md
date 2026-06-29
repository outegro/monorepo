# payments — дизайн (Ch9)

> Статус: **дизайн-док** (решения до кода). Заземлён на реальную модель entitlements в
> `auth-backend` и топологию `@outegro/contracts`. Заменяет старый idea-doc `payments.md`
> (Paddle/Prodamus → теперь **Lemon Squeezy** сейчас, **Robokassa** для РФ-карт позже).

## 0. Главный принцип (не нарушать)

- **Entitlements — единственная валюта доступа.** Таблица в auth: `(userId, service, role,
  source, expiresAt)`, минтятся в JWT как `roles: ["service:role"]`. Каждый сабсервис гейтит
  по ним. **payments НИКОГДА не общается с сабсервисами напрямую** — он лишь приводит к
  изменению entitlements в auth.
- **Разделение источников правды:** payments = деньги + подписки; auth = доступ (entitlements).
  auth не хранит платёжного состояния, payments не знает, что именно открывает роль.
- **payments — источник правды по подпискам.** На изменение подписки эмитит событие → auth
  пересобирает entitlements (`source=payment`).

## 1. Связка «план → entitlements» (сердце дизайна)

Каталог в payments-backend (порядок вложенности):

```
product            «itmaxxing Pro», «Outegro Super», «Expense Plus»
 └ plan            биллинг-вариант: интервал (month/year), уровень (tier), активность
    ├ plan_grants  НАБОР entitlements этого плана: [(service, role), …]
    └ plan_prices  цена у провайдера: (provider, providerPriceId, currency, amount)
```

- **Уровни подписки = роль.** `(itmaxxing, free)` / `(itmaxxing, pro)` / `(itmaxxing, team)`.
  Что открывает роль — решает сам сабсервис. payments только присваивает.
- **Подписка на конкретный сервис** = план с одним грантом: `[(itmaxxing, pro)]`.
- **СУПЕР-подписка на всё сразу** = НЕ спецслучай, а просто план с многими грантами:
  `[(itmaxxing, pro), (expense, pro), (ecommerce, pro), …]`. Никакой особой логики — super
  это план с широким `plan_grants`. Добавили сервис → добавили грант в супер-план.
- **Стэкинг аддитивный, без «вычитаний».** У юзера может быть несколько подписок; итоговые
  entitlements = объединение грантов всех активных подписок. Если super и per-service дают одну
  и ту же `(service, role)` — она просто одна (UNIQUE в auth по `(userId, service, role)`),
  `expiresAt` берём максимальный. Покупка super поверх per-service не ломает ничего.

## 2. Синхронизация подписка → entitlements (ключевое решение — ДЕКЛАРАТИВНО)

На каждый вебхук провайдера payments-backend:
1. Верифицирует подпись → дедуп (`processed_webhooks.eventId UNIQUE`) → обновляет `subscriptions`.
2. **Пересобирает ЖЕЛАЕМЫЙ полный набор entitlements** этого юзера из всех его активных подписок
   и эмитит `payment.entitlements.changed` с **полным целевым набором** (не дельтами):
   ```jsonc
   { "userId": "...", "entitlements": [
       { "service": "itmaxxing", "role": "pro", "expiresAt": "2026-08-01T..." },
       { "service": "expense",   "role": "pro", "expiresAt": "2026-08-01T..." }
   ] }
   ```
3. **auth — новый consumer** (auth был только publisher!) на `payment.#` → **реконсилит**:
   приводит `source=payment` entitlements юзера ровно к набору из события (добавить недостающие,
   убрать отсутствующие, обновить `expiresAt`). `source=manual` (admin-гранты) не трогает.

**Почему полный набор, а не grant/revoke-дельты:** вебхуки провайдера приходят с дубликатами и
не по порядку. Декларативное «вот желаемое состояние» идемпотентно и самовосстанавливается —
пропущенный/повторённый вебхук не приводит к дрейфу прав. Это главное решение по надёжности.

**Грейс-период.** `expiresAt = currentPeriodEnd + 1–2 дня` — поздний вебхук о продлении не мигает
доступом. На `cancel` право живёт до конца оплаченного периода. На `past_due/payment_failed` —
до конца грейса, потом дроп. Near-real-time отзыв обеспечивает короткий TTL access-токена +
liveness (уже есть); entitlements берутся при mint/refresh.

## 3. Мульти-провайдер (LS сейчас, Robokassa позже)

Единый порт:
```ts
interface PaymentProvider {
  createCheckout(userId, planId, opts): Promise<{ url: string }>;   // hosted checkout
  parseWebhook(headers, rawBody): ProviderEvent | null;             // verify signature → normalize
  cancelSubscription?(providerSubId): Promise<void>;
  portalUrl?(providerCustomerId): Promise<string>;                  // self-serve billing portal
}
```
| Провайдер | Назначение | Модель | Статус |
|-----------|-----------|--------|--------|
| **Lemon Squeezy** | межд. карты, **Merchant of Record** (берёт на себя НДС/налоги) | hosted checkout + подписки + webhooks + customer portal | **MVP** |
| **Robokassa** (или аналог) | РФ-карты | redirect-оплата (разовые) → рекуррентность эмулируем периодич. инвойсами/пассами | позже |

- LS даёт подписки нативно; Robokassa — разовые платежи → для РФ продаём **фиксированные пассы**
  (период-based entitlement) либо собственный recurring поверх сохранённого токена. Эту разницу
  инкапсулирует адаптер; ядро видит только `subscriptions`/`entitlements`.
- **Один логический план → много provider-цен** (`plan_prices`). Выбор провайдера на чекауте по
  региону/валюте (есть `cf-ipcountry`!) или явному выбору юзера. РФ → Robokassa/RUB, иначе → LS.

## 4. Данные (своя БД `payments` в CNPG — роль+Database уже заведены)

```
customers(userId UNIQUE, createdAt)
provider_customers(customerId, provider, providerCustomerId)     -- маппинг на провайдера
products(id, key UNIQUE, name, active)
plans(id, productId, key, name, interval, tierRole, active)
plan_grants(planId, service, role)                               -- набор entitlements плана
plan_prices(planId, provider, providerPriceId, currency, amount) -- цена у провайдера
subscriptions(id, userId, planId, provider, providerSubId UNIQUE, status,
              currentPeriodEnd, cancelAtPeriodEnd, createdAt, updatedAt)
transactions(id, userId, provider, providerTxId, amount, currency, status,
             kind[payment|refund], subscriptionId?, createdAt)
processed_webhooks(provider, eventId, receivedAt)               -- UNIQUE(provider,eventId), TTL 30d
outbox(...)                                                      -- тот же паттерн, что в auth/notif
-- позже: invoices, ledger (double-entry), reconciliation_runs
```
Статусы подписки нормализуем к: `trialing|active|past_due|canceled|expired`.

## 5. pay-web (BFF, `pay.outegro.com`)

- **Authed (Outegro ID SSO)**: страница тарифов → «Подписаться» → `createCheckout` → redirect к
  провайдеру; история платежей; текущий план; отмена/возобновление; ссылка в customer-portal.
  BFF проксирует payments-backend (ClusterIP), как id-web. Гейт — JWT + liveness.
- **Вебхуки**: `pay.outegro.com/api/webhooks/[provider]` (публичный) → форвард in-cluster в
  payments-backend (как telegram-webhook через id-web). Подпись **валидирует backend** (BFF
  только прокидывает сырое тело + заголовки подписи).

## 6. Надёжность

- Идемпотентность вебхуков (`processed_webhooks`), **outbox** в payments (события транзакционно с
  апдейтом подписки), декларативная реконсиляция в auth (см. §2).
- **Reconciliation-джоба** (позже): ночью тянем подписки у провайдера, сверяем, чиним дрейф.
- **Ledger / refunds / chargebacks / invoices / налоги** — поздний проход (когда реально пойдут
  деньги). В MVP: чекаут + вебхуки + подписки + entitlement-sync, transactions как журнал.

## 7. Что добавить в платформу под это

- `@outegro/contracts`: exchange `payment` + ключ `payment.entitlements.changed` + Zod-схема
  события (полный набор entitlements). (`payment` уже заложен в комментах topology.)
- **auth-backend: новый consumer** `payment.#` + `EntitlementsReconciler` (источник `payment`).
  Это первый раз, когда auth не только публикует, но и потребляет.
- Новый app `payments-backend` + `pay-web` (скаффолд-папки есть). БД `payments`+роль уже в
  `cnpg-cluster.yaml`.
- **itmaxxing не блокируется на payments:** стартует на `free` + ручных admin-грантах; payments
  (Ch9) потом автоматизирует выдачу `pro`.

## 8. Решения

**🔒 Зафиксировано (2026-06-25):**
- **Выдача доступа — СОБЫТИЯ** (не синхронный вызов). payments эмитит через outbox →
  RabbitMQ `payment.#` → **новый auth-consumer** реконсилит entitlements (§2). Развязка +
  отказоустойчивость; eventual consistency ~секунды приемлема.
- **Каталог `plan_grants` — в payments** (§1). payments хранит пары `(service, role)` как
  непрозрачные строки и передаёт ГОТОВЫЕ entitlements; auth их только хранит/реконсилит, про
  продукты/цены не знает.
- **Имя события — `payment.entitlements.changed`** (декларативный полный набор, см. §2).

**Ещё открыто:**
1. **Robokassa-рекуррентность** — фикс-пассы (проще) vs эмуляция подписки. Предлагаю **пассы**.
2. **Триал** — даём ли бесплатный trial-период (LS умеет)? Влияет на статусы/гейт.
3. **Цены/тиры по сервисам** — конкретный прайслист (список планов + что входит) — от тебя.
