import { getTranslations } from "next-intl/server";
import { ContentWorkspace } from "@/components/ContentWorkspace";
import { UnderDevelopmentCard } from "@/components/UnderDevelopmentCard";
import { getProductLocks } from "@/lib/product-locks-server";
import { isFeatureLocked } from "@/lib/product-locks";

export default async function CreatorsContentPage() {
  const t = await getTranslations("studio.content");
  const tc = await getTranslations("studio.creators");
  const locks = await getProductLocks();
  if (isFeatureLocked(locks, "content")) {
    return (
      <UnderDevelopmentCard
        title={t("title")}
        backHref="/dashboard/creators"
        backLabel={tc("backToCreators")}
      />
    );
  }
  return <ContentWorkspace />;
}
