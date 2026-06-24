import { type NextRequest, NextResponse } from "next/server";
import { callBackend, csrfOk, setSessionCookies } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** Public: verify the passkey ceremony → mint a session and set cookies (like email verify). */
export async function POST(req: NextRequest) {
  if (!csrfOk(req)) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const r = await callBackend(req, "/auth/passkeys/authentication/verify", body);
  const tokens = r.data as { accessToken?: string; refreshToken?: string } | null;
  if (r.status >= 200 && r.status < 300 && tokens?.accessToken && tokens.refreshToken) {
    const res = NextResponse.json({ ok: true });
    setSessionCookies(res, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    return res;
  }
  return NextResponse.json(r.data ?? {}, { status: r.status });
}
