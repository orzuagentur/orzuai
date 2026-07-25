import { PhotoEditorStudio } from "@/components/PhotoEditorStudio";
import { UnderDevelopmentCard } from "@/components/UnderDevelopmentCard";
import { getProductLocks } from "@/lib/product-locks-server";
import { isFeatureLocked } from "@/lib/product-locks";

export default async function PhotoEditorPage() {
  const locks = await getProductLocks();
  if (isFeatureLocked(locks, "photo_editor")) {
    return (
      <UnderDevelopmentCard
        title="Photo editor"
        backHref="/dashboard/creators"
        backLabel="For creators"
      />
    );
  }
  return <PhotoEditorStudio />;
}
