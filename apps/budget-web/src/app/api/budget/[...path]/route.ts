import { type NextRequest, NextResponse } from "next/server";
import { csrfOk, proxyBudget } from "@/lib/backend";

export const dynamic = "force-dynamic";

/**
 * Single BFF passthrough to budget-backend for every domain endpoint (months, expenses,
 * incomes, base templates, settings, FX). The browser only ever talks here; budget-backend
 * is ClusterIP-only and verifies the forwarded bearer via JWKS.
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
  return proxyBudget(req, target, method, body);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
