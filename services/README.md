# outegro services — reference

> Это **НЕ код**. Это собранные наработки из предыдущих документов про outegro
> (`outegro/final-docs-outegro/`, `outegro/docs/OUTEGRO.md`, `outegro/docs/SERVICES.md`).
> На эти заметки можно опереться, когда будем описывать сервисы заново.

Каждый файл в этой папке — концентрат того, что мы уже решили про сервис:
зачем он, какие методы, какие данные, какие эмитит/потребляет события,
как связан с auth/notifications/payments.

| Файл | Сервис | Опорная дока |
|------|--------|--------------|
| [`landing.md`](./landing.md) | landing-web | `final-docs/09-landing.md`, `OUTEGRO.md` §9.1 |
| [`auth.md`](./auth.md) | auth-web + auth-backend | `final-docs/07-auth.md`, `OUTEGRO.md` §9.2 |
| [`notifications.md`](./notifications.md) | notifications-backend | `final-docs/08-notifications.md`, `OUTEGRO.md` §9.3 |
| [`payments.md`](./payments.md) | payments-web + payments-backend | `final-docs/13-payment-service.md`, `OUTEGRO.md` §9.4 |

**Ничего из этого нельзя считать финальной спецификацией** — это reference для
будущих обсуждений. Все архитектурные решения перепроверяются перед написанием
кода.

## Hard rules из `OUTEGRO.md`, которые сохраняются

- ≥2 реплики на каждый self-written сервис, RollingUpdate `maxUnavailable:0`/`maxSurge:1`.
- DB-per-service (своя БД в CNPG, свой managed-role, кросс-данные только через API/события).
- Миграции как k8s Job, не на boot приложения.
- BFF: браузер ходит только в `app/api/*`, бэки ClusterIP-only.
- Forward-only + backward-compatible миграции (expand → migrate → contract).
- Entitlements-based авторизация (НЕ roles per-service).
- Домены: `outegro.com`, `auth.outegro.com`, `payments.outegro.com`. Wildcard TLS.
