import { type NextRequest, NextResponse } from "next/server";
import { callBackend, setSessionCookies } from "@/lib/backend";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Google redirects the browser here with ?code&state. We forward them to auth-backend
 * (which validates state + verifies the id_token), then set session cookies on login or
 * just bounce to /profile on link, and land the user back in the app.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/login?error=google", serverEnv.publicOrigin));
  }

  const r = await callBackend(req, "/auth/google/callback", { code, state });
  const data = r.data as {
    accessToken?: string;
    refreshToken?: string;
    linked?: boolean;
  } | null;

  if (r.status >= 200 && r.status < 300) {
    const res = NextResponse.redirect(new URL("/profile", serverEnv.publicOrigin));
    if (data?.accessToken && data.refreshToken) {
      setSessionCookies(res, { accessToken: data.accessToken, refreshToken: data.refreshToken });
    }
    return res;
  }
  return NextResponse.redirect(new URL("/login?error=google", serverEnv.publicOrigin));
}
