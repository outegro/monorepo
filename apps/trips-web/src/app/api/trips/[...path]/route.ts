import { type NextRequest, NextResponse } from "next/server";
import { csrfOk, proxyTrips } from "@/lib/backend";

export const dynamic = "force-dynamic";
// /reels/process runs extraction + Kakao search over a batch sequentially, which is slow
// on purpose (rate limits). Give it headroom rather than cutting a run off half-done.
export const maxDuration = 120;

/**
 * Single BFF passthrough to trips-backend (reels, review, places). The browser only ever
 * talks here; trips-backend is ClusterIP-only and verifies the forwarded bearer via JWKS.
 */
async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const method = req.method as "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  if (method !== "GET" && !csrfOk(req)) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }
  const search = req.nextUrl.search;
  const target = `/${path.join("/")}${search}`;
  const body =
    method === "GET" || method === "DELETE" ? undefined : await req.json().catch(() => null);
  return proxyTrips(req, target, method, body);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
