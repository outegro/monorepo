import { type NextRequest, NextResponse } from "next/server";
import { callBackend, csrfOk, setSessionCookies } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** Verify the code → on success store the token pair in httpOnly cookies (BFF owns tokens). */
export async function POST(req: NextRequest) {
  if (!csrfOk(req)) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const r = await callBackend(req, "/auth/verify", body);
  const tokens = r.data as { accessToken?: string; refreshToken?: string } | null;
  if (r.status >= 200 && r.status < 300 && tokens?.accessToken && tokens.refreshToken) {
    const res = NextResponse.json({ ok: true });
    setSessionCookies(res, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    return res;
  }
  return NextResponse.json(r.data ?? {}, { status: r.status });
}
