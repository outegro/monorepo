import { type NextRequest, NextResponse } from "next/server";
import { csrfOk } from "@/lib/backend";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Resolve the caller's userId from the access cookie (no refresh-retry — profile pre-warms it). */
async function resolveUserId(req: NextRequest): Promise<string | null> {
  const access = req.cookies.get(serverEnv.accessCookie)?.value;
  if (!access) {
    return null;
  }
  const res = await fetch(`${serverEnv.authApiBase}/auth/me`, {
    headers: { authorization: `Bearer ${access}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return null;
  }
  const me = (await res.json().catch(() => null)) as { id?: string } | null;
  return me?.id ?? null;
}

/** Telegram link status (proxied to notifications' internal endpoint with the shared key). */
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }
  const res = await fetch(
    `${serverEnv.notifyApiBase}/internal/telegram/status?userId=${encodeURIComponent(userId)}`,
    { headers: { "x-internal-key": serverEnv.internalApiKey }, cache: "no-store" },
  );
  const data = await res.json().catch(() => ({ linked: false }));
  return NextResponse.json(data, { status: res.status });
}

/** Disconnect Telegram. */
export async function DELETE(req: NextRequest) {
  if (!csrfOk(req)) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }
  const userId = await resolveUserId(req);
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
  return NextResponse.json(data, { status: res.status });
}
