import type { SupabaseClient } from "@supabase/supabase-js";

import { sendTelegramTextMessage } from "@/lib/telegram/client";
import type { WebsiteFormSubmissionInput } from "@/types/website-forms.types";
import type { Database } from "@/types/database.types";

const TELEGRAM_FIELD_KEYS = [
  "telegram_chat_id",
  "chat_id",
  "telegram",
  "telegram_username",
  "tg",
] as const;

function normalizeTelegramChatId(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const withoutPrefix = trimmed
    .replace(/^tg:/i, "")
    .replace(/^@/, "")
    .trim();

  if (/^\d+$/.test(withoutPrefix)) {
    return withoutPrefix;
  }

  return null;
}

export function extractTelegramChatIdFromSubmission(
  submission: WebsiteFormSubmissionInput,
): string | null {
  for (const key of TELEGRAM_FIELD_KEYS) {
    const fieldValue = submission.fields?.[key];

    if (typeof fieldValue === "string") {
      const chatId = normalizeTelegramChatId(fieldValue);

      if (chatId) {
        return chatId;
      }
    }
  }

  if (submission.phone) {
    return normalizeTelegramChatId(submission.phone);
  }

  return null;
}

export async function sendWebsiteFormTelegramFollowUp(input: {
  admin: SupabaseClient<Database>;
  businessId: string;
  submission: WebsiteFormSubmissionInput;
  message: string;
}): Promise<boolean> {
  const { admin, businessId, submission, message } = input;

  const { data: connection } = await admin
    .from("telegram_connections")
    .select("bot_token, telegram_status")
    .eq("business_id", businessId)
    .eq("telegram_status", "connected")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!connection?.bot_token) {
    return false;
  }

  let chatId = extractTelegramChatIdFromSubmission(submission);

  if (!chatId && submission.email?.trim()) {
    const email = submission.email.trim().toLowerCase();
    const { data: contact } = await admin
      .from("contacts")
      .select("phone_number")
      .eq("business_id", businessId)
      .eq("channel", "telegram")
      .eq("email", email)
      .maybeSingle();

    chatId = contact?.phone_number
      ? normalizeTelegramChatId(contact.phone_number)
      : null;
  }

  if (!chatId) {
    return false;
  }

  const sendResult = await sendTelegramTextMessage(
    connection.bot_token,
    chatId,
    message,
  );

  return sendResult.success;
}
