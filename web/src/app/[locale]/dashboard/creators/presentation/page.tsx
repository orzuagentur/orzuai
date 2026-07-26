import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PresentationStudio } from "@/components/presentation/PresentationStudio";

export default async function PresentationPage() {
  const tCommon = await getTranslations("common");
  return (
    <Suspense
      fallback={
        <p className="px-4 py-10 text-sm text-[var(--muted)]">{tCommon("loading")}</p>
      }
    >
      <PresentationStudio />
    </Suspense>
  );
}
