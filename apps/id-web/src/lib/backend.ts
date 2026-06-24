import { type NextRequest, NextResponse } from "next/server";
import { ACCESS_MAX_AGE, REFRESH_MAX_AGE, serverEnv } from "./env";

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface BackendResult {
  status: number;
  data: unknown;
}

/**
 * Forward the real client UA/IP/geo to auth-backend so session metadata, IP rate-limits
 * and security alerts reflect the browser, not the BFF pod.
 */
function forwardedHeaders(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = { "content-type": "application/json" };
  for (const h of [
    "user-agent",
    "cf-connecting-ip",
    "cf-ipcountry",
    "cf-ipcity",
    "x-forwarded-for",
  ]) {
    const v = req.headers.get(h);
    if (v) {
      out[h] = v;
    }
  }
  return out;
}

/** Same-origin guard for state-changing routes (skipped in dev where origin is localhost). */
export function csrfOk(req: NextRequest): boolean {
  if (!serverEnv.isProd) {
    return true;
  }
  const origin = req.headers.get("origin");
  return origin === serverEnv.publicOrigin;
}

/** Call auth-backend in-cluster, returning its status + parsed JSON (best-effort). */
export async function callBackend(
  req: NextRequest,
  path: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<BackendResult> {
  const res = await fetch(`${serverEnv.authApiBase}${path}`, {
    method: "POST",
    headers: { ...forwardedHeaders(req), ...extraHeaders },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

/** GET with the access token as Bearer (for /auth/me, /auth/sessions, …). */
export async function callBackendAuthed(path: string, accessToken: string): Promise<BackendResult> {
  const res = await fetch(`${serverEnv.authApiBase}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

/** Method-agnostic backend call carrying the access token as Bearer. */
async function backendWithBearer(
  req: NextRequest,
  path: string,
  method: "GET" | "POST" | "DELETE",
  accessToken: string,
  body?: unknown,
): Promise<BackendResult> {
  const res = await fetch(`${serverEnv.authApiBase}${path}`, {
    method,
    headers: { ...forwardedHeaders(req), authorization: `Bearer ${accessToken}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

/**
 * Proxy an authenticated request, transparently refreshing once on 401 and persisting the
 * rotated token pair (short access TTL must never surface to the user as a logout). On a
 * dead session, clears the cookies.
 */
export async function proxyAuthed(
  req: NextRequest,
  path: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: unknown,
): Promise<NextResponse> {
  const access = req.cookies.get(serverEnv.accessCookie)?.value;
  let result: BackendResult = access
    ? await backendWithBearer(req, path, method, access, body)
    : { status: 401, data: null };
  let refreshed: SessionTokens | null = null;

  if (result.status === 401) {
    const refresh = req.cookies.get(serverEnv.refreshCookie)?.value;
    if (refresh) {
      const rr = await callBackend(req, "/auth/refresh", { refreshToken: refresh });
      const t = rr.data as { accessToken?: string; refreshToken?: string } | null;
      if (rr.status >= 200 && rr.status < 300 && t?.accessToken && t.refreshToken) {
        refreshed = { accessToken: t.accessToken, refreshToken: t.refreshToken };
        result = await backendWithBearer(req, path, method, refreshed.accessToken, body);
      }
    }
  }

  const res = jsonResponse(result);
  if (refreshed) {
    setSessionCookies(res, refreshed);
  } else if (result.status === 401) {
    clearSessionCookies(res);
  }
  return res;
}

/**
 * Build a NextResponse from a backend result. 204/205/304 are "null-body" statuses —
 * the Response constructor throws if handed a body, so a 204 from the backend (passkey
 * register, session delete, …) must NOT be wrapped in `NextResponse.json({})` (that crash
 * surfaced to users as "Could not add the passkey" even though the backend had stored it).
 */
export function jsonResponse(result: BackendResult): NextResponse {
  if (result.status === 204 || result.status === 205 || result.status === 304) {
    return new NextResponse(null, { status: result.status });
  }
  return NextResponse.json(result.data ?? {}, { status: result.status });
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax",
  secure: serverEnv.isProd,
  path: "/",
} as const;

/** Set the access cookie (host-only) + refresh cookie (.outegro.com) from a token pair. */
export function setSessionCookies(res: NextResponse, tokens: SessionTokens): void {
  res.cookies.set({
    ...cookieBase,
    name: serverEnv.accessCookie,
    value: tokens.accessToken,
    maxAge: ACCESS_MAX_AGE,
  });
  res.cookies.set({
    ...cookieBase,
    name: serverEnv.refreshCookie,
    value: tokens.refreshToken,
    maxAge: REFRESH_MAX_AGE,
    ...(serverEnv.cookieDomain ? { domain: serverEnv.cookieDomain } : {}),
  });
}

export function clearSessionCookies(res: NextResponse): void {
  res.cookies.set({ ...cookieBase, name: serverEnv.accessCookie, value: "", maxAge: 0 });
  res.cookies.set({
    ...cookieBase,
    name: serverEnv.refreshCookie,
    value: "",
    maxAge: 0,
    ...(serverEnv.cookieDomain ? { domain: serverEnv.cookieDomain } : {}),
  });
}
