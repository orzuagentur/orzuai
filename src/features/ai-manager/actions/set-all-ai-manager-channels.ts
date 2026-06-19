"use server";

import { setMessagingChannelsAiEnabled } from "@/services/channel-workspace.service";

export async function setAllAiManagerChannelsAction(enabled: boolean) {
  return setMessagingChannelsAiEnabled(enabled);
}
