"use server";

import { saveChannelAiBehavior } from "@/services/channel-workspace.service";
import type { SaveChannelAiBehaviorInput } from "@/types/channel-workspace.types";

export async function saveChannelAiBehaviorAction(
  input: SaveChannelAiBehaviorInput,
) {
  return saveChannelAiBehavior(input);
}
