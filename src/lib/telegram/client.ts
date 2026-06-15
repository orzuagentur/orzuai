import { timingSafeEqual } from "crypto";

import { TELEGRAM_API_BASE } from "@/lib/telegram/constants";

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export type TelegramBotInfo = {
  id: number;
  username: string;
  first_name: string;
};

async function callTelegramApi<T>(
  botToken: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<{ success: true; result: T } | { success: false; message: string }> {
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | TelegramApiResponse<T>
    | null;

  if (!response.ok || !payload?.ok || payload.result === undefined) {
    return {
      success: false,
      message: payload?.description ?? "Telegram API request failed.",
    };
  }

  return { success: true, result: payload.result };
}

export async function getTelegramBotInfo(
  botToken: string,
): Promise<{ success: true; bot: TelegramBotInfo } | { success: false; message: string }> {
  const result = await callTelegramApi<TelegramBotInfo>(botToken, "getMe");

  if (!result.success) {
    return result;
  }

  return { success: true, bot: result.result };
}

export async function deleteTelegramWebhook(
  botToken: string,
): Promise<{ success: true } | { success: false; message: string }> {
  const result = await callTelegramApi<boolean>(botToken, "deleteWebhook", {
    drop_pending_updates: true,
  });

  if (!result.success) {
    return result;
  }

  return { success: true };
}

export async function setTelegramWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken: string,
): Promise<{ success: true } | { success: false; message: string }> {
  const result = await callTelegramApi<boolean>(botToken, "setWebhook", {
    url: webhookUrl,
    secret_token: secretToken,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });

  if (!result.success) {
    return result;
  }

  return { success: true };
}

type TelegramFileInfo = {
  file_id: string;
  file_path?: string;
};

async function sendTelegramMultipart(
  botToken: string,
  method: string,
  fields: Record<string, string>,
  fileField: string,
  file: Blob,
  fileName: string,
): Promise<{ success: true } | { success: false; message: string }> {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  formData.append(fileField, file, fileName);

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/${method}`, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | TelegramApiResponse<{ message_id: number }>
    | null;

  if (!response.ok || !payload?.ok) {
    return {
      success: false,
      message: payload?.description ?? "Telegram media request failed.",
    };
  }

  return { success: true };
}

export async function sendTelegramMediaMessage(
  botToken: string,
  chatId: string,
  file: Blob,
  fileName: string,
  mimeType: string,
  options?: { caption?: string },
): Promise<{ success: true } | { success: false; message: string }> {
  const caption = options?.caption?.trim();
  const fields: Record<string, string> = { chat_id: chatId };

  if (caption) {
    fields.caption = caption;
  }

  if (mimeType.startsWith("image/")) {
    return sendTelegramMultipart(botToken, "sendPhoto", fields, "photo", file, fileName);
  }

  if (mimeType === "audio/ogg" || mimeType === "audio/opus") {
    return sendTelegramMultipart(botToken, "sendVoice", fields, "voice", file, fileName);
  }

  if (mimeType.startsWith("audio/")) {
    return sendTelegramMultipart(botToken, "sendAudio", fields, "audio", file, fileName);
  }

  if (mimeType.startsWith("video/")) {
    return sendTelegramMultipart(botToken, "sendVideo", fields, "video", file, fileName);
  }

  return sendTelegramMultipart(
    botToken,
    "sendDocument",
    fields,
    "document",
    file,
    fileName,
  );
}

export async function sendTelegramMediaMessageByUrl(
  botToken: string,
  chatId: string,
  mediaUrl: string,
  mimeType: string,
  options?: { caption?: string },
): Promise<{ success: true } | { success: false; message: string }> {
  const caption = options?.caption?.trim();
  const fields: Record<string, unknown> = {
    chat_id: chatId,
  };

  if (caption) {
    fields.caption = caption;
  }

  if (mimeType.startsWith("image/")) {
    return callTelegramApi<boolean>(botToken, "sendPhoto", {
      ...fields,
      photo: mediaUrl,
    }).then((result) =>
      result.success ? { success: true as const } : result,
    );
  }

  if (mimeType === "audio/ogg" || mimeType === "audio/opus") {
    return callTelegramApi<boolean>(botToken, "sendVoice", {
      ...fields,
      voice: mediaUrl,
    }).then((result) =>
      result.success ? { success: true as const } : result,
    );
  }

  if (mimeType.startsWith("audio/")) {
    return callTelegramApi<boolean>(botToken, "sendAudio", {
      ...fields,
      audio: mediaUrl,
    }).then((result) =>
      result.success ? { success: true as const } : result,
    );
  }

  if (mimeType.startsWith("video/")) {
    return callTelegramApi<boolean>(botToken, "sendVideo", {
      ...fields,
      video: mediaUrl,
    }).then((result) =>
      result.success ? { success: true as const } : result,
    );
  }

  return callTelegramApi<boolean>(botToken, "sendDocument", {
    ...fields,
    document: mediaUrl,
  }).then((result) =>
    result.success ? { success: true as const } : result,
  );
}

export async function getTelegramFile(
  botToken: string,
  fileId: string,
): Promise<
  | { success: true; file: TelegramFileInfo }
  | { success: false; message: string }
> {
  const result = await callTelegramApi<TelegramFileInfo>(botToken, "getFile", {
    file_id: fileId,
  });

  if (!result.success) {
    return result;
  }

  if (!result.result.file_path) {
    return {
      success: false,
      message: "Telegram file path is missing.",
    };
  }

  return { success: true, file: result.result };
}

export async function getTelegramUserProfilePhotoFileId(
  botToken: string,
  userId: number,
): Promise<{ success: true; fileId: string } | { success: false }> {
  const result = await callTelegramApi<{
    total_count: number;
    photos: Array<Array<{ file_id: string }>>;
  }>(botToken, "getUserProfilePhotos", {
    user_id: userId,
    limit: 1,
  });

  if (!result.success || result.result.total_count < 1) {
    return { success: false };
  }

  const sizes = result.result.photos[0];

  if (!sizes?.length) {
    return { success: false };
  }

  const largest = sizes[sizes.length - 1];

  if (!largest?.file_id) {
    return { success: false };
  }

  return { success: true, fileId: largest.file_id };
}

export async function downloadTelegramFile(
  botToken: string,
  fileId: string,
  fallbackFileName: string,
): Promise<
  | {
      success: true;
      buffer: Buffer;
      mimeType: string;
      fileName: string;
    }
  | { success: false; message: string }
> {
  const fileResult = await getTelegramFile(botToken, fileId);

  if (!fileResult.success) {
    return fileResult;
  }

  const response = await fetch(
    `${TELEGRAM_API_BASE}/file/bot${botToken}/${fileResult.file.file_path}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return {
      success: false,
      message: "Unable to download Telegram file.",
    };
  }

  const mimeType =
    response.headers.get("content-type") || "application/octet-stream";
  const fileName = fallbackFileName.includes(".")
    ? fallbackFileName
    : fileResult.file.file_path?.split("/").pop() || fallbackFileName;

  return {
    success: true,
    buffer: Buffer.from(await response.arrayBuffer()),
    mimeType,
    fileName,
  };
}

export type TelegramChatAction =
  | "typing"
  | "upload_photo"
  | "upload_video"
  | "upload_voice"
  | "upload_document";

export async function sendTelegramChatAction(
  botToken: string,
  chatId: string,
  action: TelegramChatAction,
): Promise<{ success: true } | { success: false; message: string }> {
  const result = await callTelegramApi<boolean>(botToken, "sendChatAction", {
    chat_id: chatId,
    action,
  });

  if (!result.success) {
    return result;
  }

  return { success: true };
}

export async function sendTelegramTextMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<
  { success: true; messageId: string } | { success: false; message: string }
> {
  const result = await callTelegramApi<{ message_id: number }>(
    botToken,
    "sendMessage",
    {
      chat_id: chatId,
      text,
    },
  );

  if (!result.success) {
    return result;
  }

  return { success: true, messageId: String(result.result.message_id) };
}

export function verifyTelegramWebhookSecret(
  headerValue: string | null,
  expectedSecret: string,
): boolean {
  if (!headerValue || !expectedSecret) {
    return false;
  }

  const received = Buffer.from(headerValue);
  const expected = Buffer.from(expectedSecret);

  if (received.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(received, expected);
}
