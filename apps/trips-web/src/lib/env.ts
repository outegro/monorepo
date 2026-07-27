/**
 * Server-only BFF config. trips-web shares Outegro ID SSO: the refresh cookie lives on
 * `.outegro.com`, so trips-web mints its own host-only access cookie by calling
 * auth-backend's /auth/refresh, then proxies the bearer to trips-backend (both
 * ClusterIP-only).
 */
const isProd = process.env.NODE_ENV === "production";

export const serverEnv = {
  /** auth-backend — used for refresh / me / logout. */
  authApiBase: process.env.AUTH_API_BASE ?? "http://auth-backend:80",
  /** trips-backend — reels, review queue, places. */
  tripsApiBase: process.env.TRIPS_API_BASE ?? "http://trips-backend:80",
  /** Where to send users to sign in (Outegro ID). */
  idOrigin: process.env.ID_ORIGIN ?? "https://id.outegro.com",
  publicOrigin: process.env.PUBLIC_ORIGIN ?? "https://trips.outegro.com",
  cookieDomain: process.env.COOKIE_DOMAIN ?? (isProd ? ".outegro.com" : ""),
  accessCookie: "og_access",
  refreshCookie: process.env.REFRESH_COOKIE ?? "outegro_refresh",
  isProd,
} as const;

export const ACCESS_MAX_AGE = 300; // matches auth-backend ACCESS_TTL
export const REFRESH_MAX_AGE = 2_592_000; // 30 days

/**
 * Kakao Maps JS SDK key. Public by design — it ships to the browser and is protected by the
 * domain allow-list in the Kakao console (플랫폼 → Web), not by secrecy. That is why it is a
 * NEXT_PUBLIC_ build-time value and not part of the sealed secret: the REST key in
 * trips-backend is the one that must stay server-side.
 *
 * Empty string when unset — the map components degrade to a plain list rather than throwing.
 */
export const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";
