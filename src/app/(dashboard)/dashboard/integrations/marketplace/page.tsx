import { IntegrationsMarketplace } from "@/components/integrations/IntegrationsMarketplace";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getChannelConnectionStatuses } from "@/services/channel-workspace.service";

export default async function IntegrationsMarketplacePage() {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;
  const channelStatuses = business
    ? await getChannelConnectionStatuses(business.id)
    : {};

  return <IntegrationsMarketplace channelStatuses={channelStatuses} />;
}
