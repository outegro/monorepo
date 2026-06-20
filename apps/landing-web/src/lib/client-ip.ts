/**
 * Real client IP for a request that reached us through Cloudflare → Traefik.
 *
 * `x-forwarded-for` is unreliable here: k3s exposes Traefik via hostPort, and the
 * source IP gets SNAT'd to a cluster-internal address (we observed 10.42.0.1). So
 * prefer Cloudflare's `cf-connecting-ip`, which CF always sets to the true client
 * IP and passes through untouched. Fall back to the usual proxy headers.
 *
 * Returned value is forwarded to the backend so its per-IP rate limit keys on the
 * actual visitor, not on one shared internal IP.
 */
export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ""
  );
}
