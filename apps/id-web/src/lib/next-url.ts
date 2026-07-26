/**
 * Post-login redirect target. A subservice (budget, itmaxxing, …) sends users to
 * `/login?next=<its url>`; this is the open-redirect guard on that parameter — only
 * absolute https URLs on outegro.com or one of its subdomains are honoured.
 *
 * Kept out of the page component so it is testable: it is the only place where an
 * attacker-controlled string decides where an authenticated user lands.
 */
export function safeNextUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const sameSite =
      url.protocol === "https:" &&
      (url.hostname === "outegro.com" || url.hostname.endsWith(".outegro.com"));
    return sameSite ? url.href : null;
  } catch {
    return null;
  }
}
