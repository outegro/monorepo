import type { NextRequest, NextResponse } from "next/server";
import { ACCESS_MAX_AGE, REFRESH_MAX_AGE, serverEnv } from "./env";

interface SessionTokens {
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
  for (const h of ["user-agent", "cf-connecting-ip", "cf-ipcountry", "x-forwarded-for"]) {
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
