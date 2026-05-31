"use server";

import { syncWhatsAppMessages } from "@/services/whatsapp.service";
import type { SyncWhatsAppResult } from "@/types/whatsapp.types";

export async function syncWhatsAppAction(): Promise<SyncWhatsAppResult> {
  return syncWhatsAppMessages();
}
