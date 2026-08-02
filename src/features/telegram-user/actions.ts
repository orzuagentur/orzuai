"use server";

import {
  confirmTelegramUserCode,
  confirmTelegramUserPassword,
  disconnectTelegramUser,
  startTelegramUserLogin,
  type TelegramUserActionResult,
} from "@/services/telegram-user.service";

export async function startTelegramUserLoginAction(
  phoneNumber: string,
): Promise<TelegramUserActionResult> {
  return startTelegramUserLogin(phoneNumber);
}

export async function confirmTelegramUserCodeAction(
  code: string,
): Promise<TelegramUserActionResult> {
  return confirmTelegramUserCode(code);
}

export async function confirmTelegramUserPasswordAction(
  password: string,
): Promise<TelegramUserActionResult> {
  return confirmTelegramUserPassword(password);
}

export async function disconnectTelegramUserAction(): Promise<TelegramUserActionResult> {
  return disconnectTelegramUser();
}
