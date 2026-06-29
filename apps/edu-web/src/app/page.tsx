import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** No separate marketing surface — go straight to the course list (which gates on auth). */
export default function Home() {
  redirect("/courses");
}
