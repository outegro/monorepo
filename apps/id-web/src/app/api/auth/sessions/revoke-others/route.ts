import { type NextRequest, NextResponse } from "next/server";
import { csrfOk, proxyAuthed } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** "Sign out everywhere else" — terminate all sessions except the current one. */
export async function POST(req: NextRequest) {
  if (!csrfOk(req)) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }
  return proxyAuthed(req, "/auth/sessions/revoke-others", "POST", {});
}
