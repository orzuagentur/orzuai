import { ContentWorkspace } from "@/components/ContentWorkspace";
import { UnderDevelopmentCard } from "@/components/UnderDevelopmentCard";
import { getProductLocks } from "@/lib/product-locks-server";
import { isFeatureLocked } from "@/lib/product-locks";

export default async function CreatorsContentPage() {
  const locks = await getProductLocks();
  if (isFeatureLocked(locks, "content")) {
    return (
      <UnderDevelopmentCard
        title="Content studio"
        backHref="/dashboard/creators"
        backLabel="For creators"
      />
    );
  }
  return <ContentWorkspace />;
}
