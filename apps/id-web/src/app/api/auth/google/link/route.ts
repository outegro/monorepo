import { type NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Authenticated: start the Google consent flow that links to the current account. */
export async function GET(req: NextRequest) {
  const access = req.cookies.get(serverEnv.accessCookie)?.value;
  if (!access) {
    return NextResponse.redirect(new URL("/login", serverEnv.publicOrigin));
  }
  const res = await fetch(`${serverEnv.authApiBase}/auth/google/link`, {
    headers: { authorization: `Bearer ${access}` },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as { url?: string } | null;
  if (res.ok && data?.url) {
    return NextResponse.redirect(data.url);
  }
  return NextResponse.redirect(new URL("/profile?error=google", serverEnv.publicOrigin));
}
