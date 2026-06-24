import { type NextRequest, NextResponse } from "next/server";
import { csrfOk, proxyAuthed } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** Store the freshly created passkey for the current account. */
export async function POST(req: NextRequest) {
  if (!csrfOk(req)) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  return proxyAuthed(req, "/auth/passkeys/registration/verify", "POST", body);
}
