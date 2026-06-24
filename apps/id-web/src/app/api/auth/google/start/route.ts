import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Public: bounce the browser to Google's consent screen (auth-backend builds the URL). */
export async function GET() {
  const res = await fetch(`${serverEnv.authApiBase}/auth/google/start`, { cache: "no-store" });
  const data = (await res.json().catch(() => null)) as { url?: string } | null;
  if (res.ok && data?.url) {
    return NextResponse.redirect(data.url);
  }
  return NextResponse.redirect(new URL("/login?error=google", serverEnv.publicOrigin));
}
