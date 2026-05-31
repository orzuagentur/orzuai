import { BusinessSettingsPanel } from "@/components/business/BusinessSettingsPanel";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { mapBusinessToProfile } from "@/utils/business";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your business profile, logo, contact information, and account.
        </p>
      </div>

      <BusinessSettingsPanel
        business={business ? mapBusinessToProfile(business) : null}
      />
    </div>
  );
}
