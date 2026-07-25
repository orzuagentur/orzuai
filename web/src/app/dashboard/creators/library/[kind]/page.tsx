import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CreatorsStudio } from "@/components/CreatorsStudio";
import { isStudioKind } from "@/lib/studio-kind";

export default async function CreatorsLibraryKindPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!isStudioKind(kind)) notFound();

  return (
    <Suspense
      fallback={
        <p className="px-4 py-10 text-sm text-[var(--muted)]">
          Loading library…
        </p>
      }
    >
      <CreatorsStudio kind={kind} />
    </Suspense>
  );
}
