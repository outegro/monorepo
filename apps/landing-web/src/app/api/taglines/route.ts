import { NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { ApiError, apiFetch } from "@/lib/fetcher";

export const dynamic = "force-dynamic";

/** POST /api/taglines — queue an AI tagline job. Forwards the real client IP so
 *  the backend's per-IP rate limit sees the visitor, not the shared cluster IP. */
export async function POST(req: Request) {
  const body = await req.text();
  const ip = clientIp(req);

  try {
    const data = await apiFetch("/taglines", {
      method: "POST",
      body,
      headers: ip ? { "x-forwarded-for": ip, "cf-connecting-ip": ip } : {},
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
