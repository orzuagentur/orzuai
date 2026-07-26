import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PresentationStudio } from "@/components/presentation/PresentationStudio";
import { UnderDevelopmentCard } from "@/components/UnderDevelopmentCard";
import { getProductLocks } from "@/lib/product-locks-server";
import { isFeatureLocked } from "@/lib/product-locks";

export default async function PresentationPage() {
  const tCommon = await getTranslations("common");
  const t = await getTranslations("studio.presentation");
  const locks = await getProductLocks();
  if (isFeatureLocked(locks, "presentation_editor")) {
    return <UnderDevelopmentCard title={t("presentationTitle")} />;
  }
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
