"use server";

import { disconnectWhatsApp } from "@/services/whatsapp.service";

export async function disconnectWhatsAppAction() {
  return disconnectWhatsApp();
}
