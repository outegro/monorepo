import { NextResponse } from "next/server";
import { ApiError, apiFetch } from "@/lib/fetcher";

export const dynamic = "force-dynamic";

/** GET /api/taglines/:id — poll job status/result. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const data = await apiFetch(`/taglines/${encodeURIComponent(id)}`);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof ApiError) {
      return new NextResponse(e.body, {
        status: e.status,
        headers: { "content-type": "application/json" },
      });
    }
    return NextResponse.json({ error: "upstream unavailable" }, { status: 502 });
  }
}
