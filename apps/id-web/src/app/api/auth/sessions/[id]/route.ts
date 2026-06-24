import { type NextRequest, NextResponse } from "next/server";
import { csrfOk, proxyAuthed } from "@/lib/backend";

export const dynamic = "force-dynamic";

/** Terminate one of the current account's sessions. */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!csrfOk(req)) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  return proxyAuthed(req, `/auth/sessions/${encodeURIComponent(id)}`, "DELETE");
}
