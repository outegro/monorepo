import { type NextRequest, NextResponse } from "next/server";
import { csrfOk, proxyItmaxxing } from "@/lib/backend";

export const dynamic = "force-dynamic";
// LLM passes (intake/structure) can take many seconds on a reasoning model — give the
// route generous headroom so it isn't cut off mid-generation.
export const maxDuration = 120;

/**
 * Single BFF passthrough to itmaxxing-backend (lore intake/structure, entries, profile). The
 * browser only ever talks here; itmaxxing-backend is ClusterIP-only and verifies the forwarded
 * bearer via JWKS.
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
  return proxyItmaxxing(req, target, method, body);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
