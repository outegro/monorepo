import type { NextRequest } from "next/server";
import { proxyAuthed } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** List the current account's passkeys. */
export function GET(req: NextRequest) {
  return proxyAuthed(req, "/auth/passkeys", "GET");
}
