import { type NextRequest, NextResponse } from "next/server";
import { callBackend, csrfOk } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** Start email-code login: proxy to auth-backend, which emails a one-time code. Always 202. */
export async function POST(req: NextRequest) {
  if (!csrfOk(req)) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const r = await callBackend(req, "/auth/request", body);
  return NextResponse.json(r.data ?? {}, { status: r.status });
}
