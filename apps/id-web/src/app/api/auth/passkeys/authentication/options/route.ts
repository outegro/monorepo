import { type NextRequest, NextResponse } from "next/server";
import { callBackend } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** Public: challenge for a passwordless passkey sign-in (discoverable credentials). */
export async function POST(req: NextRequest) {
  const r = await callBackend(req, "/auth/passkeys/authentication/options", {});
  return NextResponse.json(r.data ?? {}, { status: r.status });
}
