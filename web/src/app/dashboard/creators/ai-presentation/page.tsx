import { Suspense } from "react";
import { AiPresentationStudio } from "@/components/AiPresentationStudio";

export default function AiPresentationPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[color:var(--muted)]">Loading…</p>
      }
    >
      <AiPresentationStudio />
    </Suspense>
  );
}
