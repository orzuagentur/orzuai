import { getTranslations } from "next-intl/server";
import { PhotoEditorStudio } from "@/components/PhotoEditorStudio";
import { UnderDevelopmentCard } from "@/components/UnderDevelopmentCard";
import { getProductLocks } from "@/lib/product-locks-server";
import { isFeatureLocked } from "@/lib/product-locks";

export default async function PhotoEditorPage() {
  const t = await getTranslations("studio.photoEditor");
  const tc = await getTranslations("studio.creators");
  const locks = await getProductLocks();
  if (isFeatureLocked(locks, "photo_editor")) {
    return (
      <UnderDevelopmentCard
        title={t("title")}
        backHref="/dashboard/creators"
        backLabel={tc("backToCreators")}
      />
    );
  }
  return <PhotoEditorStudio />;
}
