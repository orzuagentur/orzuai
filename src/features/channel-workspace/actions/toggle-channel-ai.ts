"use server";

import { revalidatePath } from "next/cache";

import { DASHBOARD_ROUTES } from "@/constants/routes";
import { isMessagingIntegrationChannel } from "@/features/integrations";
import type { IntegrationChannelId } from "@/features/integrations";
import { updateChannelAiEnabled } from "@/services/channel-workspace.service";

export async function toggleChannelAiAction(
  channel: string,
  enabled: boolean,
): Promise<{ success: boolean; message?: string }> {
  const channelId = channel as IntegrationChannelId;

  if (!isMessagingIntegrationChannel(channelId)) {
    return { success: false, message: "Invalid channel." };
  }

  const result = await updateChannelAiEnabled(channelId, enabled);

  if (result.success) {
    revalidatePath(DASHBOARD_ROUTES.aiAssistant);
    revalidatePath(`${DASHBOARD_ROUTES.integrations}/${channel}`);
    revalidatePath(DASHBOARD_ROUTES.integrations);
  }

  return result;
}
