import "server-only";

import { CHAT_MESSAGES } from "@/features/chats/constants";
import { hasSupabaseEnv } from "@/lib/env";
import { getChatAttachmentSignedUrl } from "@/services/chat-attachment-signed-url.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { requireUser } from "@/services/auth.service";
import {
  extractStoragePathFromUrl,
  type ChatMediaPayload,
} from "@/utils/chat-media";

export type ChatMediaUrlResult =
  | { success: true; url: string }
  | { success: false; error: { code: string; message: string } };

export type ChatMediaUrlsBatchResult =
  | { success: true; urls: Record<string, string> }
  | { success: false; error: { code: string; message: string } };

function resolvePath(input: {
  path?: string;
  url?: string;
}): string | null {
  if (input.path?.trim()) {
    return input.path.trim();
  }

  if (input.url?.trim()) {
    return extractStoragePathFromUrl(input.url);
  }

  return null;
}

export async function resolveChatMediaUrl(input: {
  path?: string;
  url?: string;
}): Promise<ChatMediaUrlResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CHAT_MESSAGES.genericError },
    };
  }

  const path = resolvePath(input);

  if (!path) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: CHAT_MESSAGES.genericError },
    };
  }

  const businessId = path.split("/")[0];

  if (!businessId) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: CHAT_MESSAGES.genericError },
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || business.id !== businessId) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: CHAT_MESSAGES.genericError },
    };
  }

  const signedUrl = await getChatAttachmentSignedUrl(path);

  if (!signedUrl) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: CHAT_MESSAGES.genericError },
    };
  }

  return { success: true, url: signedUrl };
}

export async function resolveChatMediaUrlsBatch(
  paths: string[],
): Promise<ChatMediaUrlsBatchResult> {
  if (!hasSupabaseEnv()) {
    return {
      success: false,
      error: { code: "MISSING_CONFIG", message: CHAT_MESSAGES.genericError },
    };
  }

  const uniquePaths = [...new Set(paths.map((path) => path.trim()).filter(Boolean))];

  if (uniquePaths.length === 0) {
    return { success: true, urls: {} };
  }

  const businessId = uniquePaths[0]!.split("/")[0];

  if (!businessId || uniquePaths.some((path) => path.split("/")[0] !== businessId)) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: CHAT_MESSAGES.genericError },
    };
  }

  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business || business.id !== businessId) {
    return {
      success: false,
      error: { code: "FORBIDDEN", message: CHAT_MESSAGES.genericError },
    };
  }

  const entries = await Promise.all(
    uniquePaths.map(async (path) => {
      const signedUrl = await getChatAttachmentSignedUrl(path);
      return signedUrl ? ([path, signedUrl] as const) : null;
    }),
  );

  const urls: Record<string, string> = {};

  for (const entry of entries) {
    if (entry) {
      urls[entry[0]] = entry[1];
    }
  }

  return { success: true, urls };
}

export async function resolveChatMediaPayloadUrl(
  media: ChatMediaPayload,
): Promise<ChatMediaUrlResult> {
  return resolveChatMediaUrl({
    path: media.path,
    url: media.url,
  });
}
