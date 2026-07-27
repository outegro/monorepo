"use client";

import { AddReels } from "@/components/add-reels";
import { ReviewQueue } from "@/components/review-queue";
import { Shell } from "@/components/shell";

export default function HomePage() {
  return (
    <main className="min-h-dvh">
      <Shell>
        {() => (
          <div className="flex flex-col gap-6">
            <AddReels />
            <ReviewQueue />
          </div>
        )}
      </Shell>
    </main>
  );
}
