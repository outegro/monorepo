import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness/readiness for the standalone Next server. No backend deps yet. */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
