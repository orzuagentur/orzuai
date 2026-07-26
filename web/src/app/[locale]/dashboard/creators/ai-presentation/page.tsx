import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AiPresentationStudio } from "@/components/AiPresentationStudio";
import { UnderDevelopmentCard } from "@/components/UnderDevelopmentCard";
import { getProductLocks } from "@/lib/product-locks-server";
import { isFeatureLocked } from "@/lib/product-locks";

export default async function AiPresentationPage() {
  const tCommon = await getTranslations("common");
  const t = await getTranslations("studio.aiPresentation");
  const locks = await getProductLocks();
  if (
    isFeatureLocked(locks, "ai_presentation") ||
    isFeatureLocked(locks, "presentation_editor")
  ) {
    return <UnderDevelopmentCard title={t("title")} />;
  }
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
