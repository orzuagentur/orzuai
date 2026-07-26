import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AiPresentationStudio } from "@/components/AiPresentationStudio";

export default async function AiPresentationPage() {
  const tCommon = await getTranslations("common");
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[color:var(--muted)]">{tCommon("loading")}</p>
      }
    >
      <AiPresentationStudio />
    </Suspense>
  );
}
