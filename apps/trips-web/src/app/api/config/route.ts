import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Client-visible configuration, resolved at RUNTIME.
 *
 * `NEXT_PUBLIC_*` would be the obvious way to ship the Kakao JS key, but Next inlines those at
 * `next build`, and this image is built once in CI and configured per environment by the Helm
 * chart — the value would silently be whatever was set (nothing) at build time, and the map
 * would never load with no error to explain why.
 *
 * The key itself is public by design: it ships to the browser and is protected by the domain
 * allow-list in the Kakao console, not by secrecy.
 */
export function GET() {
  return NextResponse.json({ kakaoJsKey: serverEnv.kakaoJsKey });
}
