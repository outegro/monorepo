"use client";

import { use } from "react";
import { PlaceDetail } from "@/components/place-detail";
import { Shell } from "@/components/shell";

export default function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <main className="min-h-dvh">
      <Shell>{() => <PlaceDetail id={id} />}</Shell>
    </main>
  );
}
