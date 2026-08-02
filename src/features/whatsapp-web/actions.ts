"use server";

import {
  disconnectWhatsAppWeb,
  startWhatsAppWebConnection,
  type WhatsAppWebActionResult,
} from "@/services/whatsapp-web.service";

export async function startWhatsAppWebConnectionAction(): Promise<WhatsAppWebActionResult> {
  return startWhatsAppWebConnection();
}

export async function disconnectWhatsAppWebAction(): Promise<WhatsAppWebActionResult> {
  return disconnectWhatsAppWeb();
}
