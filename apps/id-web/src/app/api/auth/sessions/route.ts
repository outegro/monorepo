import type { NextRequest } from "next/server";
import { proxyAuthed } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** The current account's active sessions. */
export function GET(req: NextRequest) {
  return proxyAuthed(req, "/auth/sessions", "GET");
}
