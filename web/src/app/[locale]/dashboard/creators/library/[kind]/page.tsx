import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CreatorsStudio } from "@/components/CreatorsStudio";
import { UnderDevelopmentCard } from "@/components/UnderDevelopmentCard";
import { getProductLocks } from "@/lib/product-locks-server";
import { isFeatureLocked } from "@/lib/product-locks";
import { isStudioKind } from "@/lib/studio-kind";

export default async function CreatorsLibraryKindPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!isStudioKind(kind)) notFound();

  const t = await getTranslations("studio.library");
  const navT = await getTranslations("nav");
  const locks = await getProductLocks();
  if (isFeatureLocked(locks, "asset_libraries")) {
    return <UnderDevelopmentCard title={navT("assetLibraries")} />;
  }

  return (
    <Suspense
      fallback={
        <p className="px-4 py-10 text-sm text-[var(--muted)]">
          {t("loadingLibrary")}
        </p>
      }
    >
      <CreatorsStudio kind={kind} />
    </Suspense>
  );
}
