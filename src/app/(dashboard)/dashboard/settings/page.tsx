import { BusinessSettingsPanel } from "@/components/business/BusinessSettingsPanel";
import { CannedResponsesPanel } from "@/components/settings/CannedResponsesPanel";
import { TeamPanel } from "@/components/team/TeamPanel";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { listCannedResponses } from "@/services/canned-responses.service";
import { listTeamMembers } from "@/services/team.service";
import { mapBusinessToProfile } from "@/utils/business";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;
  const [cannedResponses, teamMembers] = business
    ? await Promise.all([listCannedResponses(), listTeamMembers(business.id)])
    : [[], []];

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

      {business ? (
        <>
          <TeamPanel members={teamMembers} />
          <div className="mx-auto w-full max-w-3xl">
            <CannedResponsesPanel initialResponses={cannedResponses} />
          </div>
        </>
      ) : null}
    </div>
  );
}
