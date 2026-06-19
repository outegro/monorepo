import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const locales = ["en", "ru"] as const;
type Locale = (typeof locales)[number];
const defaultLocale: Locale = "en";

/**
 * Single-locale-aware config (no URL-based routing). Locale is read from a cookie;
 * add the next-intl middleware later if you want `/en` / `/ru` path segments.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const candidate = cookieStore.get("NEXT_LOCALE")?.value as Locale | undefined;
  const locale = candidate && locales.includes(candidate) ? candidate : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
