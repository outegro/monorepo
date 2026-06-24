import type { NextRequest } from "next/server";
import { proxyAuthed } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** The current account's configured sign-in methods (email / google / passkeys). */
export function GET(req: NextRequest) {
  return proxyAuthed(req, "/auth/identities", "GET");
}
