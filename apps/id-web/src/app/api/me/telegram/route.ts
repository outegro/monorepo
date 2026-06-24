import { type NextRequest, NextResponse } from "next/server";
import { authedUserId, csrfOk, setSessionCookies } from "@/lib/backend";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Telegram link status (proxied to notifications' internal endpoint with the shared key). */
export async function GET(req: NextRequest) {
  const { userId, refreshed } = await authedUserId(req);
  if (!userId) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }
  const res = await fetch(
    `${serverEnv.notifyApiBase}/internal/telegram/status?userId=${encodeURIComponent(userId)}`,
    { headers: { "x-internal-key": serverEnv.internalApiKey }, cache: "no-store" },
  );
  const data = await res.json().catch(() => ({ linked: false }));
  const out = NextResponse.json(data, { status: res.status });
  if (refreshed) {
    setSessionCookies(out, refreshed);
  }
  return out;
}

/** Disconnect Telegram. */
export async function DELETE(req: NextRequest) {
  if (!csrfOk(req)) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }
  const { userId, refreshed } = await authedUserId(req);
  if (!userId) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }
  const res = await fetch(`${serverEnv.notifyApiBase}/internal/telegram/unlink`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-internal-key": serverEnv.internalApiKey },
    body: JSON.stringify({ userId }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({ removed: false }));
  const out = NextResponse.json(data, { status: res.status });
  if (refreshed) {
    setSessionCookies(out, refreshed);
  }
  return out;
}
