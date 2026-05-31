import { BusinessLogoUpload } from "@/components/business/BusinessLogoUpload";
import { BusinessProfileForm } from "@/components/business/BusinessProfileForm";
import type { BusinessProfileData } from "@/types/business.types";

type BusinessSettingsPanelProps = {
  business: BusinessProfileData | null;
};

export function BusinessSettingsPanel({ business }: BusinessSettingsPanelProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <BusinessLogoUpload businessId={business?.id} logoUrl={business?.logoUrl} />
      <BusinessProfileForm business={business} />
    </div>
  );
}
