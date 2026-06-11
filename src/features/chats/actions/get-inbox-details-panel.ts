"use server";

import { getInboxDetailsPanel } from "@/services/inbox-details.service";
import type { InboxDetailsPanelInput, InboxDetailsPanelResult } from "@/services/inbox-details.service";

export async function getInboxDetailsPanelAction(
  input: InboxDetailsPanelInput,
): Promise<InboxDetailsPanelResult> {
  return getInboxDetailsPanel(input);
}
