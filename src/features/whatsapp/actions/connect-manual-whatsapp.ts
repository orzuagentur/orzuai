"use server";

import { connectManualWhatsApp } from "@/services/whatsapp.service";
import type {
  ConnectManualWhatsAppInput,
  ConnectManualWhatsAppResult,
} from "@/types/whatsapp.types";

export async function connectManualWhatsAppAction(
  input: ConnectManualWhatsAppInput,
): Promise<ConnectManualWhatsAppResult> {
  return connectManualWhatsApp(input);
}
