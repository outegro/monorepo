import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/fetcher";

export const dynamic = "force-dynamic";

/**
 * BFF deep health — pings the backend's /health/deep and reports.
 * Returns 200 only if both the BFF and the backend are healthy.
 * AUDIT_MINIMAX #65: was previously a stub returning `{ status: "ok" }`.
 */
export async function GET() {
  try {
    const backend = await apiFetch<{ status: "ok"; database: "up" }>("/health/deep");
    return NextResponse.json({ status: "ok", backend: backend.status, database: backend.database });
  } catch (e) {
    return NextResponse.json(
      { status: "degraded", error: e instanceof Error ? e.message : "unknown" },
      { status: 503 },
    );
  }
}
