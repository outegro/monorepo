# Outegro ID (auth) + Notifications — Integration Guide

Everything a new subservice (backend + frontend) needs to plug into the platform's shared
**Outegro ID** SSO and send **notifications**. Written for a fresh service that lives in this
monorepo (`apps/<name>-backend`, `apps/<name>-frontend`) but is otherwise self-contained.

> **The one-sentence model.** Every subservice owns its own DB and never touches auth's DB.
> The browser talks only to your frontend's `/api/*` route handlers (**BFF**). Your BFF forwards
> a short-lived access token (Bearer) to your backend, which verifies it **statelessly** against
> auth's public JWKS. To notify a user you publish one RabbitMQ event and forget it.

---

## 0. Vocabulary & topology

| Thing | Value | Notes |
|---|---|---|
| Auth issuer (`iss`) | `https://id.outegro.com` | claim on every access token |
| Audience (`aud`) | `outegro` | claim on every access token |
| JWKS URL (in-cluster) | `http://auth-backend:80/.well-known/jwks.json` | public keys; verify signatures here |
| Access token TTL | **300 s (5 min)** | short on purpose — revocation is bounded by this |
| Refresh token TTL | 30 days | rotating, reuse-detected |
| Access cookie | `og_access` | **host-only**, httpOnly — set by *your* BFF per-service |
| Refresh cookie | `outegro_refresh` | httpOnly, `Domain=.outegro.com` — **shared** across all subservices |
| Sign-in page | `https://id.outegro.com/login?next=<your-url>` | central login (email-code / Google / passkey) |

**Two networks:**
- **Public** — browser → your frontend (`https://<svc>.outegro.com`). That's the only origin the browser sees.
- **In-cluster** — your BFF → `http://auth-backend:80`, your BFF → your backend, your backend → JWKS. All ClusterIP, no CORS.

Backends are **never** exposed publicly for app traffic. Everything goes through the BFF.

---

## 1. How SSO actually works (the flow)

```
                        ┌─────────────────────────── id.outegro.com (Outegro ID) ───┐
Browser                 │  /login  →  email-code / Google / passkey  →  sets:        │
  │                     │     og_access   (host-only, id.outegro.com)                │
  │  not signed in      │     outegro_refresh (Domain=.outegro.com)  ◄── shared      │
  │  ───────────────────┼──► redirect to /login?next=https://budget.outegro.com/     │
  │  ◄──────────────────┼─── after sign-in, browser lands back on your site          │
  ▼                     └───────────────────────────────────────────────────────────┘
budget.outegro.com (your frontend)
  │  GET /api/auth/me
  ▼
Your BFF (Next route handler)
  │  has og_access?  → GET auth-backend /auth/me  (Bearer)      → 200 user
  │  401 / no og_access?  → POST auth-backend /auth/refresh { refreshToken: outegro_refresh }
  │                          → mints a NEW og_access for YOUR host + rotates refresh
  │                          → retries /auth/me
  ▼
Your backend (only for domain data, e.g. /months)
  │  verifies Bearer og_access against JWKS  → { userId, sessionId, roles }
```

Key point: **the refresh cookie is shared** (`.outegro.com`), the **access cookie is per-service**
(host-only `og_access`). A user who signed in on `id.outegro.com` arrives at `budget.outegro.com`
with no `og_access` for that host — but *with* the shared refresh cookie. Your BFF's first
`/api/auth/me` sees no access token, refreshes using the shared cookie, and mints an `og_access`
scoped to your host. That's the whole SSO trick — no redirect dance needed once the refresh cookie exists.

---

## 2. Auth backend — HTTP API reference

All under `auth-backend` (in-cluster `http://auth-backend:80`, public via id-web BFF only).
`@UseGuards(JwtAuthGuard)` = requires a valid Bearer access token.

### Session lifecycle (called by BFFs, not the browser directly)
| Method | Path | Guard | Body / returns |
|---|---|---|---|
| POST | `/auth/request` | — | `{ email }` → `{ status: "sent" }`. Emails a 6-digit code. Rate-limited per email+IP. |
| POST | `/auth/verify` | — | `{ email, code }` → **`SessionTokens`** `{ accessToken, refreshToken, sessionId }`. |
| POST | `/auth/refresh` | — | `{ refreshToken }` → **`SessionTokens`** (rotated). Reuse of an old token ⇒ 401 + kills the session. |
| POST | `/auth/logout` | — | `{ refreshToken }` → 204. Revokes the session (Redis + DB). |

### Identity / profile (Bearer required)
| Method | Path | Returns |
|---|---|---|
| GET | `/auth/me` | `{ id, email, emailVerified, locale, createdAt }` |
| GET | `/auth/entitlements` | `[{ id, service, role, source, expiresAt }]` — authoritative roles (don't trust stale token claims for gating money-features) |
| GET | `/auth/identities` | `{ email, emailVerified, google: string[], passkeys: number }` |
| GET | `/auth/sessions` | `[{ ...session, current: boolean }]` — device/geo/lastActive |
| DELETE | `/auth/sessions/:id` | 204 — revoke one session |
| POST | `/auth/sessions/revoke-others` | 204 — "log out everywhere else" |

### Federated sign-in (public start, BFF forwards)
| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/auth/google/start` | — | → `{ url }` Google consent URL (BFF 307-redirects the browser there) |
| GET | `/auth/google/link` | Bearer | same, but links Google to the current account |
| POST | `/auth/google/callback` | — | `{ code, state }` → `SessionTokens` (login) or `{ linked: true }` (link). Idempotent per state. |
| POST | `/auth/passkeys/registration/options` | Bearer | WebAuthn create options |
| POST | `/auth/passkeys/registration/verify` | Bearer | `{ response, name? }` → 204 |
| GET | `/auth/passkeys` | Bearer | list credentials |
| DELETE | `/auth/passkeys/:id` | Bearer | 204 |
| POST | `/auth/passkeys/authentication/options` | — | → `{ challengeId, options }` (discoverable) |
| POST | `/auth/passkeys/authentication/verify` | — | `{ challengeId, response }` → `SessionTokens` |

### Telegram linking
| Method | Path | Guard | Notes |
|---|---|---|---|
| POST | `/auth/telegram/link-token` | Bearer | → one-time `https://t.me/<bot>?start=<nonce>` deep-link |
| POST | `/internal/telegram/consume` | `X-Internal-Key` | notifications-only: nonce → userId |

### Health
- `GET /health` → liveness (cheap). `GET /health/deep` → readiness (pings Postgres + Redis).

---

## 3. Backend integration — verify the token (copy 3 files)

Your backend must verify the Bearer **statelessly** against JWKS. No Redis, no call to auth on
the hot path. Copy these verbatim from `apps/budget-backend/src/common/` (they're identical across
edu/budget/auth):

**`src/common/current-user.decorator.ts`**
```ts
export interface AuthUser { userId: string; sessionId: string; roles: string[]; }

export const CurrentUser = createParamDecorator(
  (_data, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
```

**`src/common/jwt-auth.guard.ts`** — verifies signature + `iss`/`aud`, extracts `sub`→userId,
`sid`→sessionId, `roles`. Rejects with `401 { code: "unauthorized" | "invalid_token" }`.
```ts
this.jwks = createRemoteJWKSet(new URL(config.get("JWKS_URL")));
// ...
const { payload } = await jwtVerify(header.slice(7), this.jwks, {
  issuer: config.get("JWT_ISSUER"),     // https://id.outegro.com
  audience: config.get("JWT_AUDIENCE"), // outegro
});
req.user = { userId: String(payload.sub), sessionId: String(payload.sid), roles: payload.roles ?? [] };
```

**Env (Zod, fail-fast on boot)** — add to `src/config/env.validation.ts`:
```ts
JWKS_URL:     z.string().default("http://auth-backend:80/.well-known/jwks.json"),
JWT_ISSUER:   z.string().default("https://id.outegro.com"),
JWT_AUDIENCE: z.string().default("outegro"),
```

**Use it in a controller** — every row is scoped by `userId`; you own your DB, `userId` is just
a string column (an FK to auth's users table is a hard-rule violation):
```ts
@Controller()
@UseGuards(JwtAuthGuard)               // class-level → all routes require auth
export class BudgetController {
  @Get("months")
  list(@CurrentUser() user: AuthUser) {
    return this.budget.listForUser(user.userId);   // never trust a userId from the body/query
  }
}
```

**Gating on a paid role?** The token's `roles` claim is fine for UX, but for authoritative
money-gating call `GET /auth/entitlements` (roles can be revoked mid-token-lifetime; the claim
lags up to 5 min). For most subservices, `roles` on the token is enough.

---

## 4. Frontend integration — the BFF (this is the important part)

Your frontend is a **Next standalone** app. The browser talks only to `/api/*` route handlers.
Those handlers hold the tokens and proxy to backends. **Copy the whole pattern from
`apps/budget-web`** — it's the reference. Three pieces:

### 4.1 `src/lib/env.ts` — server-only config
```ts
const isProd = process.env.NODE_ENV === "production";
export const serverEnv = {
  authApiBase:  process.env.AUTH_API_BASE  ?? "http://auth-backend:80",
  yourApiBase:  process.env.YOUR_API_BASE  ?? "http://<svc>-backend:80",
  idOrigin:     process.env.ID_ORIGIN      ?? "https://id.outegro.com",
  publicOrigin: process.env.PUBLIC_ORIGIN  ?? "https://<svc>.outegro.com",
  cookieDomain: process.env.COOKIE_DOMAIN  ?? (isProd ? ".outegro.com" : ""),
  accessCookie: "og_access",
  refreshCookie: process.env.REFRESH_COOKIE ?? "outegro_refresh",
  isProd,
} as const;
export const ACCESS_MAX_AGE = 300;        // matches auth ACCESS_TTL
export const REFRESH_MAX_AGE = 2_592_000; // 30 days
```

### 4.2 `src/lib/backend.ts` — the proxy with auto-refresh
Copy `apps/budget-web/src/lib/backend.ts`. What it gives you:

- **`proxyBudget(req, path, method, body)`** (rename to your service): the workhorse. Reads `og_access`
  from cookies → calls your backend with `Bearer`. On **401**, it reads the shared `outegro_refresh`
  cookie → `POST /auth/refresh` → on success mints a fresh `og_access` **for your host**, retries the
  call once, and persists the rotated cookies on the response. This is why a 5-min access TTL never
  surfaces as a random logout.
- **`callBackend` / `callBackendAuthed`** — talk to auth-backend (refresh / me / logout).
- **`setSessionCookies` / `clearSessionCookies`** — write `og_access` (host-only) + `outegro_refresh`
  (`Domain=.outegro.com`).
- **`csrfOk(req)`** — same-origin guard for state-changing routes (checks `Origin === publicOrigin`;
  skipped in dev).

**Two cookie-handling gotchas already baked in (don't "simplify" them away):**
1. Never send `JSON.stringify(null)` as a body — omit the body entirely on GET/DELETE/bodyless mutations,
   or a strict JSON parser 400s.
2. `NextResponse.json(null)` throws on 204/205/304 — return `new NextResponse(null, { status })` for those.

### 4.3 Route handlers
```
src/app/api/auth/me/route.ts        → GET  : forwards og_access to auth /auth/me, refresh-on-401
src/app/api/auth/refresh/route.ts   → POST : rotate session (used by the page on first load after Google)
src/app/api/auth/logout/route.ts    → POST : auth /auth/logout + clear cookies (csrfOk-guarded)
src/app/api/<svc>/[...path]/route.ts→ GET/POST/PATCH/PUT/DELETE : catch-all proxy to your backend
src/app/api/health/route.ts         → GET  : { status: "ok" } (liveness for your frontend pod)
```
The catch-all just maps `/api/<svc>/foo?x=1` → your backend `/foo?x=1`, runs `csrfOk` on mutations,
and delegates to `proxy<Svc>`. Copy `apps/budget-web/src/app/api/budget/[...path]/route.ts`.

> Include **PUT** in the catch-all's exported methods if your backend uses it (budget does, for
> `PUT /months/:id/cumulative`).

### 4.4 The login gate (client component)
Resolve the user once; if unauthenticated, bounce to Outegro ID with a `next` back to your page.
From `apps/budget-web/src/components/shell.tsx`:
```ts
function goToLogin() {
  const next = typeof window !== "undefined" ? window.location.href : "https://<svc>.outegro.com/";
  window.location.href = `https://id.outegro.com/login?next=${encodeURIComponent(next)}`;
}

// in the gate component:
useEffect(() => {
  fetch("/api/auth/me")
    .then((r) => (r.ok ? r.json() : null))
    .then(setMe)
    .catch(() => setMe(null));
}, []);
// me === undefined → spinner; me === null → <LoginGate onClick={goToLogin}/>; else render app
```
`id.outegro.com/login` only honors `next` URLs that are absolute `https` on `*.outegro.com`
(open-redirect guard), so always pass a full URL.

### 4.5 Client data layer
Point all app queries at your **own** BFF namespace, never at the backend directly. E.g. TanStack Query:
```ts
async function bfetch<T>(path: string, init?) {
  const res = await fetch(`/api/<svc>${path}`, { headers: { "content-type": "application/json" }, ...init });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.code ?? `err_${res.status}`);
  return res.status === 204 ? (undefined as T) : res.json();
}
```
See `apps/budget-web/src/lib/api.ts` for the full hook set.

---

## 5. Sending notifications

Notifications are **fire-and-forget events** on RabbitMQ. You never call the notifications service
over HTTP for sending. You publish one `notify.requested` event; notifications-backend consumes it,
resolves channels, and delivers (email via Resend / Telegram via the bot). Delivery is best-effort
per channel (an unlinked Telegram is skipped, not an error).

### 5.1 The event contract (`@outegro/contracts`)
```ts
notifyRequestedDataSchema = {
  userId: string,
  template: "login_code" | "security_alert" | "edu_notice",   // add yours to the enum if needed
  channels: ("email" | "telegram")[],                          // ≥1
  to: { email?: string, telegramChatId?: string },             // usually {} — notifications resolves it
  locale: "ru" | "en",                                         // default "ru"
  data: Record<string, unknown>,                               // template vars, e.g. { title, message }
}
```
- **Mandatory templates** (`login_code`, `security_alert`) ignore user prefs — always delivered.
- A subservice usually doesn't know the user's email (DB-per-service) → target `channels: ["telegram"]`
  with `to: {}`; notifications looks up the linked chat id and **skips silently if unlinked**.
- To add a new notification kind: extend `notifyTemplateSchema` in
  `packages/contracts/src/events/notify.ts` **and** add the template renderer in notifications-backend.
  Until then, reuse `edu_notice` (generic `{ title, message }`).

### 5.2 Publish it (transactional outbox — copy from edu-backend)
Don't publish to RabbitMQ inline (lost on crash / phantom on rollback). Write the event to an
`outbox_events` table **in the same DB transaction** as your business change; a relay publishes it.
Copy these three from `apps/edu-backend/src/notify/`: `outbox.service.ts`, `outbox.relay.ts`,
`notify.service.ts`, plus `messaging/rabbitmq.module.ts` (declares the `notify` topic exchange,
`connectionInitOptions: { wait: false }` so the pod boots even if the broker blips).

```ts
// notify.service.ts — the public API your domain code calls
async notifyUser(userId: string, title: string, message: string) {
  const data = notifyRequestedDataSchema.parse({
    userId, template: "edu_notice", channels: ["telegram"], to: {}, locale: "ru",
    data: { title, message },
  });
  await this.outbox.publish(Exchanges.Notify, makeEvent(RoutingKeys.NotifyRequested, 1, data));
}
```
For events that must be atomic with a DB write, use `outbox.enqueue(tx, exchange, event)` inside your
`prisma.$transaction(...)` instead of `publish`.

### 5.3 Required env / secrets
```ts
RABBITMQ_URL: z.string().url(),   // amqp://... (sealed secret in prod)
```
The notifications side already owns Resend + the Telegram bot; you only publish.

---

## 6. Local dev

```bash
docker compose up -d          # postgres + redis + rabbitmq
# backend: create its own DB inside that postgres, then:
pnpm --filter @outegro/<svc>-backend prisma migrate dev
pnpm --filter @outegro/<svc>-backend dev
pnpm --filter @outegro/<svc>-web dev
```
- In dev, `COOKIE_DOMAIN` is empty (host-only cookies on `localhost`) and `csrfOk` returns `true`.
- Real SSO needs the shared `.outegro.com` refresh cookie, which only exists in prod. For local UI
  work, gate behind a dev-only fake-auth flag or point `AUTH_API_BASE` at the deployed auth-backend
  through a tunnel. **Never** ship a fake-auth bypass.
- Backend health: `/health` + `/health/deep`. Frontend health: `/api/health`.

---

## 7. Checklist for a new subservice

**Backend**
- [ ] `JwtAuthGuard` + `CurrentUser` copied; `JWKS_URL`/`JWT_ISSUER`/`JWT_AUDIENCE` in env (Zod).
- [ ] Every controller `@UseGuards(JwtAuthGuard)`; every query scoped by `@CurrentUser().userId`.
- [ ] Own database; `userId` is a plain string column — **no cross-service FK**.
- [ ] (If sending notifications) outbox + relay + `notify` exchange; `RABBITMQ_URL` in env.
- [ ] `/health` (liveness) + `/health/deep` (readiness, pings own DB).

**Frontend (BFF)**
- [ ] `lib/env.ts` (`AUTH_API_BASE`, `YOUR_API_BASE`, cookie names) + `lib/backend.ts` (proxy w/ refresh-on-401).
- [ ] `/api/auth/{me,refresh,logout}` + `/api/<svc>/[...path]` catch-all (+ **PUT** if used) + `/api/health`.
- [ ] Login gate → `id.outegro.com/login?next=<full https url>`.
- [ ] Browser calls **only** `/api/*` — backend is ClusterIP-only, no CORS.
- [ ] `csrfOk` on all state-changing routes; cookies httpOnly (`og_access` host-only, `outegro_refresh` `.outegro.com`).

**Reference implementations to copy:** `apps/budget-web` (BFF), `apps/budget-backend` (guard),
`apps/edu-backend/src/notify/*` (notifications outbox).
