import type { WebsiteFormConnection } from "@/types/database.types";
import type { WebsiteFormConnectionData } from "@/types/website-forms.types";

export function mapWebsiteFormConnection(
  connection: WebsiteFormConnection,
  webhookUrl: string,
): WebsiteFormConnectionData {
  return {
    id: connection.id,
    businessId: connection.business_id,
    webhookUrl,
    apiKeyPrefix: connection.api_key_prefix,
    siteName: connection.site_name,
    siteUrl: connection.site_url,
    status: connection.connection_status,
    autoFollowUpEnabled: connection.auto_follow_up_enabled,
    followUpChannel: connection.follow_up_channel,
    connectedAt: connection.connected_at,
    lastSubmissionAt: connection.last_submission_at,
  };
}
