import { type NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Public Telegram webhook entry. Telegram has no public route to the ClusterIP-only
 * notifications service, so it calls id-web here; we forward the update (and the secret
 * header it echoes) in-cluster. notifications validates the secret.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const secret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  const res = await fetch(`${serverEnv.notifyApiBase}/telegram/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": secret },
    body,
    cache: "no-store",
  });
  return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : res.status });
}
