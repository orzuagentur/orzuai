"use server";

import { connectTelegramBot } from "@/services/telegram.service";
import type {
  ConnectTelegramBotResult,
  TelegramConnectInput,
} from "@/types/telegram.types";

export async function connectTelegramBotAction(
  input: TelegramConnectInput,
): Promise<ConnectTelegramBotResult> {
  return connectTelegramBot(input);
}
