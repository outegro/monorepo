import { type NextRequest, NextResponse } from "next/server";
import { callBackend, clearSessionCookies, setSessionCookies } from "@/lib/backend";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Rotate the session. The refresh cookie is SameSite=Lax + httpOnly, so cross-site POSTs
 * can't carry it → CSRF-safe without an extra origin check. On failure, clear cookies.
 */
export async function POST(req: NextRequest) {
  const refresh = req.cookies.get(serverEnv.refreshCookie)?.value;
  if (!refresh) {
    return NextResponse.json({ code: "no_session" }, { status: 401 });
  }
  const r = await callBackend(req, "/auth/refresh", { refreshToken: refresh });
  const tokens = r.data as { accessToken?: string; refreshToken?: string } | null;
  if (r.status >= 200 && r.status < 300 && tokens?.accessToken && tokens.refreshToken) {
    const res = NextResponse.json({ ok: true });
    setSessionCookies(res, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    return res;
  }
  const res = NextResponse.json({ code: "invalid_refresh" }, { status: 401 });
  clearSessionCookies(res);
  return res;
}
