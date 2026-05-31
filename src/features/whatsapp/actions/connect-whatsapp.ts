"use server";

import { connectWhatsApp } from "@/services/whatsapp.service";
import type {
  ConnectWhatsAppInput,
  ConnectWhatsAppResult,
} from "@/types/whatsapp.types";

export async function connectWhatsAppAction(
  input: ConnectWhatsAppInput,
): Promise<ConnectWhatsAppResult> {
  return connectWhatsApp(input);
}
