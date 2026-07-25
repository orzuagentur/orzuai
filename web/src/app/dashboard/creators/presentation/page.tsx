import { Suspense } from "react";
import { PresentationStudio } from "@/components/presentation/PresentationStudio";

export default function PresentationPage() {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-10 text-sm text-[var(--muted)]">Loading…</p>
      }
    >
      <PresentationStudio />
    </Suspense>
  );
}
