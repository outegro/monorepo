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

type Method = "GET" | "POST" | "PATCH" | "DELETE";

/** Forward real client UA/IP/geo so edu-backend sees the browser, not the BFF pod. */
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
    if (v) out[h] = v;
  }
  return out;
}

/** Same-origin guard for state-changing routes (skipped in dev). */
export function csrfOk(req: NextRequest): boolean {
  if (!serverEnv.isProd) return true;
  return req.headers.get("origin") === serverEnv.publicOrigin;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** POST to auth-backend (refresh / logout). */
export async function callBackend(
  req: NextRequest,
  path: string,
  body: unknown,
): Promise<BackendResult> {
  const res = await fetch(`${serverEnv.authApiBase}${path}`, {
    method: "POST",
    headers: forwardedHeaders(req),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return { status: res.status, data: await readJson(res) };
}

/** GET auth-backend with the access token (for /auth/me). */
export async function callBackendAuthed(path: string, accessToken: string): Promise<BackendResult> {
  const res = await fetch(`${serverEnv.authApiBase}${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  return { status: res.status, data: await readJson(res) };
}

async function callEdu(
  req: NextRequest,
  path: string,
  method: Method,
  accessToken: string,
  body?: unknown,
): Promise<BackendResult> {
  // Omit the body entirely when there's nothing to send. Sending JSON.stringify(null)
  // ("null") makes edu-backend's strict JSON body-parser reject the request with 400
  // ("null is not valid JSON") — that broke bodyless POSTs (complete-lesson, add vocab).
  const res = await fetch(`${serverEnv.eduApiBase}${path}`, {
    method,
    headers: { ...forwardedHeaders(req), authorization: `Bearer ${accessToken}` },
    ...(body != null ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  return { status: res.status, data: await readJson(res) };
}

function jsonResponse(result: BackendResult): NextResponse {
  if (result.status === 204 || result.status === 205 || result.status === 304) {
    return new NextResponse(null, { status: result.status });
  }
  return NextResponse.json(result.data ?? {}, { status: result.status });
}

/**
 * Proxy an authenticated request to edu-backend. Mints/refreshes the access token from the
 * shared Outegro refresh cookie (SSO), retrying once on 401 and persisting the rotated pair.
 */
export async function proxyEdu(
  req: NextRequest,
  path: string,
  method: Method = "GET",
  body?: unknown,
): Promise<NextResponse> {
  const access = req.cookies.get(serverEnv.accessCookie)?.value;
  let result: BackendResult = access
    ? await callEdu(req, path, method, access, body)
    : { status: 401, data: null };
  let refreshed: SessionTokens | null = null;

  if (result.status === 401) {
    const refresh = req.cookies.get(serverEnv.refreshCookie)?.value;
    if (refresh) {
      const rr = await callBackend(req, "/auth/refresh", { refreshToken: refresh });
      const t = rr.data as { accessToken?: string; refreshToken?: string } | null;
      if (rr.status >= 200 && rr.status < 300 && t?.accessToken && t.refreshToken) {
        refreshed = { accessToken: t.accessToken, refreshToken: t.refreshToken };
        result = await callEdu(req, path, method, refreshed.accessToken, body);
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

const cookieBase = {
  httpOnly: true,
  sameSite: "lax",
  secure: serverEnv.isProd,
  path: "/",
} as const;

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
