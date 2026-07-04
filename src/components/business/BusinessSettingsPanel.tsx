import { BusinessProfilePanel } from "@/components/business/BusinessProfilePanel";
import type { BusinessProfileData } from "@/types/business.types";

type BusinessSettingsPanelProps = {
  business: BusinessProfileData | null;
};

/** @deprecated Use BusinessProfilePanel directly. */
export function BusinessSettingsPanel({ business }: BusinessSettingsPanelProps) {
  return <BusinessProfilePanel business={business} />;
}
