"use server";

import { disconnectTelegram } from "@/services/telegram.service";

export async function disconnectTelegramAction() {
  return disconnectTelegram();
}
