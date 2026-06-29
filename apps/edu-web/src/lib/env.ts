/**
 * Server-only BFF config. edu-web shares Outegro ID SSO: the refresh cookie lives on
 * `.outegro.com`, so edu-web mints its own host-only access cookie by calling auth-backend's
 * /auth/refresh, then proxies the bearer to edu-backend (both ClusterIP-only).
 */
const isProd = process.env.NODE_ENV === "production";

export const serverEnv = {
  /** auth-backend — used for refresh / me / logout. */
  authApiBase: process.env.AUTH_API_BASE ?? "http://auth-backend:80",
  /** edu-backend — courses, chapters, homework, AI, vocab. */
  eduApiBase: process.env.EDU_API_BASE ?? "http://edu-backend:80",
  /** Where to send users to sign in (Outegro ID). */
  idOrigin: process.env.ID_ORIGIN ?? "https://id.outegro.com",
  publicOrigin: process.env.PUBLIC_ORIGIN ?? "https://edu.outegro.com",
  cookieDomain: process.env.COOKIE_DOMAIN ?? (isProd ? ".outegro.com" : ""),
  accessCookie: "og_access",
  refreshCookie: process.env.REFRESH_COOKIE ?? "outegro_refresh",
  isProd,
} as const;

export const ACCESS_MAX_AGE = 300; // matches auth-backend ACCESS_TTL
export const REFRESH_MAX_AGE = 2_592_000; // 30 days
