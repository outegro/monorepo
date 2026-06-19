# 6-monorepo — outegro-minimax

> Скаффолд кода. **Только инфра-обвязка** монорепо + 2 рабочих шаблона +
> reference-описания сервисов (НЕ код сервисов).

## Структура

```
6-monorepo/
├── package.json            # root: pnpm + turbo + biome + tsc
├── turbo.json
├── biome.json
├── tsconfig.base.json
├── pnpm-workspace.yaml
├── docker-compose.yml      # local deps: postgres/redis/rabbitmq
├── .env.example
│
├── apps/
│   ├── landing-web/        # Next 16 standalone — лендинг outegro.com (keeper)
│   └── example-api/        # Nest 11 — AI Tagline Generator (throwaway-демо)
│                           #   PG + Redis + RabbitMQ + MiniMax, чистая архитектура/SOLID
│
├── infra/
│   ├── Dockerfile.nest     # multi-stage, fixes AUDIT_MINIMAX #51
│   └── Dockerfile.next     # multi-stage + tini (AUDIT_MINIMAX #59)
│
├── charts/outegro-service/ # БАЗОВЫЙ Helm-чарт (его не было в исходном скаффолде)
│
├── services/               # ⚠ reference-описания, НЕ код. Опора для следующих проходов.
│   ├── landing.md
│   ├── auth.md
│   ├── notifications.md
│   └── payments.md
│
└── .github/workflows/ci.yml
```

## Definition of Done для этого шага

```bash
pnpm install
docker compose up -d        # поднимает postgres/redis/rabbitmq для dev
pnpm verify                 # format → lint → typecheck → build → test
```

`pnpm verify` должен быть зелёным после `pnpm install`. Никакого красного verify —
работа не считается законченной.

## Добавить новый сервис

1. `apps/<name>-backend`/`-web` копируешь из `apps/example-api` / `apps/landing-web`.
2. Общий код между сервисами — выноси в `packages/*` тогда, когда он реально появится (а не заранее).
3. Бэк: модуль на домен с **портами+адаптерами** (см. `example-api/src/taglines`: domain зависит от
   интерфейсов, инфра-адаптеры внедряются через DI-токены — DIP/OCP), Zod-DTO, свой JWT-guard.
4. Фронт: `features/<feature>` + BFF-роут в `src/app/api/`.
5. CI matrix в `.github/workflows/ci.yml` — добавить `{ app: <name>-backend, dockerfile: infra/Dockerfile.nest }`.

## Hard rules (наследуются, не обсуждаются)

- **Biome** для lint+format. `useImportType` OFF для `apps/*-backend` **и** `apps/*-api` (ломает NestJS DI).
- **Prisma 7** + `pg` через `@prisma/adapter-pg`. В `schema.prisma` НЕТ `url`.
- **Zod** на boot env, fail-fast.
- **BFF** — браузер ходит только в `app/api/*`. Бэки ClusterIP-only.
- **Фронты — standalone Node**, не static export.
- **Миграции — k8s Job**, не на boot приложения.
- `pnpm verify` зелёный — иначе не закрыто.
