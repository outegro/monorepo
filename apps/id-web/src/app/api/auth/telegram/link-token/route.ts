import { type NextRequest, NextResponse } from "next/server";
import { csrfOk, proxyAuthed } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** Authenticated: get a one-time t.me deep-link to connect Telegram. */
export function POST(req: NextRequest) {
  if (!csrfOk(req)) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }
  return proxyAuthed(req, "/auth/telegram/link-token", "POST", {});
}
