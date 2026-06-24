/** Request-derived client metadata, stored on sessions and used for security alerts. */
export interface ClientContext {
  userAgent?: string;
  ip?: string;
  country?: string;
  city?: string;
}

/** Extract the real client UA/IP/geo from request headers (Cloudflare-aware). */
export function clientContextFrom(req: {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}): ClientContext {
  const header = (name: string): string | undefined => {
    const v = req.headers[name];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };
  const cf = req.headers["cf-connecting-ip"];
  return {
    userAgent: header("user-agent"),
    ip: typeof cf === "string" && cf.length > 0 ? cf : req.ip,
    country: header("cf-ipcountry"),
    city: header("cf-ipcity"),
  };
}
