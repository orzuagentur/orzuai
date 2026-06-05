import { IntegrationsIndex } from "@/components/integrations/IntegrationsIndex";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getChannelConnectionStatuses } from "@/services/channel-workspace.service";

export default async function IntegrationsIndexPage() {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;
  const channelStatuses = business
    ? await getChannelConnectionStatuses(business.id)
    : {};

  return <IntegrationsIndex channelStatuses={channelStatuses} />;
}
