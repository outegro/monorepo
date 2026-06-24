import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * The ID app has no marketing surface — land users straight where they need to be.
 * A session cookie → account page, otherwise → the sign-in form (no extra click).
 */
export default async function Home() {
  const jar = await cookies();
  const signedIn = jar.has(serverEnv.accessCookie) || jar.has(serverEnv.refreshCookie);
  redirect(signedIn ? "/profile" : "/login");
}
