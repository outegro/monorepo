import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@outegro/ui";
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

/**
 * Single-locale-aware config (no URL-based routing). The locale comes from the platform's
 * shared `og_locale` cookie — the same one the subservices read — rather than next-intl's
 * default `NEXT_LOCALE`, so a language chosen on id.outegro.com also applies here.
 * Add the next-intl middleware later if you want `/en` / `/ru` path segments.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const candidate = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(candidate) ? candidate : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
