import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/fetcher";

export const dynamic = "force-dynamic";

/** GET /api/taglines/stats — total taglines generated so far. */
export async function GET() {
  try {
    const data = await apiFetch<{ generated: number }>("/taglines/stats");
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ generated: 0 }, { status: 200 });
  }
}
