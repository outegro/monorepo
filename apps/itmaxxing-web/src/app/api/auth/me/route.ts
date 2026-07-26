import { type NextRequest, NextResponse } from "next/server";
import {
  callBackend,
  callBackendAuthed,
  clearSessionCookies,
  setSessionCookies,
} from "@/lib/backend";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Current user. Forwards the access token; on 401 it transparently refreshes once
 * (short access TTL must not surface as a logout) and retries, persisting the new pair.
 */
export async function GET(req: NextRequest) {
  const access = req.cookies.get(serverEnv.accessCookie)?.value;
  if (access) {
    const r = await callBackendAuthed("/auth/me", access);
    if (r.status !== 401) {
      return NextResponse.json(r.data, { status: r.status });
    }
  }

  const refresh = req.cookies.get(serverEnv.refreshCookie)?.value;
  if (!refresh) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }
  const rr = await callBackend(req, "/auth/refresh", { refreshToken: refresh });
  const tokens = rr.data as { accessToken?: string; refreshToken?: string } | null;
  if (rr.status < 200 || rr.status >= 300 || !tokens?.accessToken || !tokens.refreshToken) {
    const res = NextResponse.json({ code: "unauthorized" }, { status: 401 });
    clearSessionCookies(res);
    return res;
  }
  const retry = await callBackendAuthed("/auth/me", tokens.accessToken);
  const res = NextResponse.json(retry.data, { status: retry.status });
  setSessionCookies(res, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  return res;
}
