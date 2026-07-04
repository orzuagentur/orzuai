import { BusinessLogoUpload } from "@/components/business/BusinessLogoUpload";
import { BusinessProfileForm } from "@/components/business/BusinessProfileForm";
import type { BusinessProfileData } from "@/types/business.types";

type BusinessProfilePanelProps = {
  business: BusinessProfileData | null;
};

export function BusinessProfilePanel({ business }: BusinessProfilePanelProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <BusinessLogoUpload businessId={business?.id} logoUrl={business?.logoUrl} />
      <BusinessProfileForm business={business} />
    </div>
  );
}
