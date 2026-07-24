import { type NextRequest, NextResponse } from "next/server";
import { callBackend, clearSessionCookies, csrfOk } from "@/lib/backend";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Revoke the session in auth-backend (Redis + DB) and clear the browser cookies. */
export async function POST(req: NextRequest) {
  if (!csrfOk(req)) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }
  const refresh = req.cookies.get(serverEnv.refreshCookie)?.value;
  if (refresh) {
    await callBackend(req, "/auth/logout", { refreshToken: refresh });
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
}
