"use client";

import { Intake } from "@/components/intake";
import { Shell } from "@/components/shell";
import { useLoreStatus } from "@/lib/api";

export default function HomePage() {
  return (
    <main className="liquid-canvas min-h-dvh">
      <Shell>{() => <IntakeView />}</Shell>
    </main>
  );
}

function IntakeView() {
  const status = useLoreStatus();
  return <Intake llmEnabled={status.data?.llmEnabled ?? false} />;
}
