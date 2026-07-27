/**
 * The platform's locale, and the one cookie that stores it.
 *
 * Every frontend used to write `og_locale` with `path=/; max-age=…` and NO `domain`, which
 * makes it host-only: a locale chosen on id.outegro.com was simply never sent to
 * budget.outegro.com or trips.outegro.com, so each subdomain silently started over. The auth
 * cookies already got this right (`outegro_refresh` is scoped to `.outegro.com`); the locale
 * cookie just never adopted it. Setting the domain here is the whole fix.
 */

/** English first: it is the default, and the list order is the menu order. */
export const LOCALES = [
  { code: "en", label: "English", short: "EN" },
  { code: "ru", label: "Русский", short: "RU" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "og_locale";
/** One year. The choice is a preference, not a session. */
const MAX_AGE = 31_536_000;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.some((l) => l.code === value);
}

/**
 * Cookie domain for the current host. `.outegro.com` in production so every subservice shares
 * one choice; undefined on localhost and on preview hosts, because a cookie scoped to a domain
 * the browser is not on is dropped silently — which would look exactly like "the switcher does
 * nothing" during local development.
 */
function cookieDomain(hostname: string): string | undefined {
  return hostname === "outegro.com" || hostname.endsWith(".outegro.com")
    ? ".outegro.com"
    : undefined;
}

export function readLocaleCookie(cookieString: string): Locale | null {
  const m = cookieString.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`));
  const value = m?.[1] ? decodeURIComponent(m[1]) : null;
  return isLocale(value) ? value : null;
}

/** Client-side write. No-op during SSR. */
export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") return;
  const domain = cookieDomain(window.location.hostname);
  document.cookie =
    `${LOCALE_COOKIE}=${locale}; path=/; max-age=${MAX_AGE}; samesite=lax` +
    (domain ? `; domain=${domain}` : "") +
    (window.location.protocol === "https:" ? "; secure" : "");
}

/**
 * Locale for a fresh visitor with no cookie yet. Falls back to English rather than to the
 * browser's language: the platform's own default is English, and a Russian-locale browser
 * landing on Russian UI made the earlier "why is trips in English" confusion harder to spot.
 */
export function detectInitialLocale(cookieString: string, navigatorLanguage?: string): Locale {
  const fromCookie = readLocaleCookie(cookieString);
  if (fromCookie) return fromCookie;
  return navigatorLanguage?.toLowerCase().startsWith("ru") ? "ru" : DEFAULT_LOCALE;
}
