/**
 * Server-only BFF config. The browser never talks to auth-backend directly — it hits
 * these Next route handlers, which proxy in-cluster (auth-backend is ClusterIP-only).
 */
const isProd = process.env.NODE_ENV === "production";

export const serverEnv = {
  /** In-cluster auth-backend (chart ClusterIP :80 → :3000). */
  authApiBase: process.env.AUTH_API_BASE ?? "http://auth-backend:80",
  /** In-cluster notifications-backend (Telegram webhook forward + link status/unlink). */
  notifyApiBase: process.env.NOTIFY_API_BASE ?? "http://notifications-backend:80",
  /** Shared key for notifications' internal endpoints (sealed). */
  internalApiKey: process.env.INTERNAL_API_KEY ?? "",
  /** Public origin of id-web, used for CSRF same-origin checks. */
  publicOrigin: process.env.PUBLIC_ORIGIN ?? "https://id.outegro.com",
  /** Refresh cookie is shared across *.outegro.com (subservice BFFs read it); empty in dev. */
  cookieDomain: process.env.COOKIE_DOMAIN ?? (isProd ? ".outegro.com" : ""),
  accessCookie: "og_access",
  refreshCookie: process.env.REFRESH_COOKIE ?? "outegro_refresh",
  isProd,
} as const;

export const ACCESS_MAX_AGE = 300; // seconds — matches auth-backend ACCESS_TTL
export const REFRESH_MAX_AGE = 2_592_000; // 30 days
