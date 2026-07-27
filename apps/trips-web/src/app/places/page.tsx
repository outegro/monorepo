"use client";

import { PlacesList } from "@/components/places-list";
import { Shell } from "@/components/shell";

export default function PlacesPage() {
  return (
    <main className="min-h-dvh">
      <Shell>{() => <PlacesList />}</Shell>
    </main>
  );
}
