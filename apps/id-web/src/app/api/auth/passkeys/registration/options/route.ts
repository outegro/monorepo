import type { NextRequest } from "next/server";
import { proxyAuthed } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** Challenge to register a new passkey on the current account. */
export function POST(req: NextRequest) {
  return proxyAuthed(req, "/auth/passkeys/registration/options", "POST", {});
}
