import { NextResponse } from "next/server";
import { ApiError, apiFetch } from "@/lib/fetcher";

export const dynamic = "force-dynamic";

/** POST /api/taglines — queue an AI tagline job. Forwards the real client IP. */
export async function POST(req: Request) {
  const body = await req.text();
  const forwardedFor = req.headers.get("x-forwarded-for") ?? "";

  try {
    const data = await apiFetch("/taglines", {
      method: "POST",
      body,
      headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {},
    });
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
