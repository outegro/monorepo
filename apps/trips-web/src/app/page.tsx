"use client";

import { AddReels } from "@/components/add-reels";
import { ReviewList } from "@/components/review-list";
import { Shell } from "@/components/shell";

export default function HomePage() {
  return (
    <main className="min-h-dvh">
      <Shell>
        {() => (
          <div className="flex flex-col gap-6">
            <AddReels />
            <ReviewList />
          </div>
        )}
      </Shell>
    </main>
  );
}
