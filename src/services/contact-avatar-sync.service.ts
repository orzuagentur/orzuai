import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  downloadTelegramFile,
  getTelegramUserProfilePhotoFileId,
} from "@/lib/telegram/client";
import { uploadContactAvatarBuffer } from "@/services/contact-avatar-storage.service";
import type { Database, MessagingChannel } from "@/types/database.types";

type MessagingDbClient = SupabaseClient<Database>;

const AVATAR_RESYNC_MS = 7 * 24 * 60 * 60 * 1000;

function shouldSyncAvatar(
  avatarUrl: string | null | undefined,
  avatarSyncedAt: string | null | undefined,
): boolean {
  if (!avatarUrl?.trim()) {
    return true;
  }

  if (!avatarSyncedAt) {
    return true;
  }

  const syncedAtMs = new Date(avatarSyncedAt).getTime();

  if (Number.isNaN(syncedAtMs)) {
    return true;
  }

  return Date.now() - syncedAtMs > AVATAR_RESYNC_MS;
}

async function persistContactAvatar(input: {
  admin: MessagingDbClient;
  businessId: string;
  contactId: string;
  buffer: Buffer;
  mimeType: string;
  name?: string;
}): Promise<string | null> {
  const avatarPath = await uploadContactAvatarBuffer({
    businessId: input.businessId,
    contactId: input.contactId,
    buffer: input.buffer,
    mimeType: input.mimeType,
  });

  if (!avatarPath) {
    return null;
  }

  const syncedAt = new Date().toISOString();
  const updatePayload: {
    avatar_url: string;
    avatar_synced_at: string;
    name?: string;
  } = {
    avatar_url: avatarPath,
    avatar_synced_at: syncedAt,
  };

  if (input.name?.trim()) {
    updatePayload.name = input.name.trim();
  }

  await input.admin
    .from("contacts")
    .update(updatePayload)
    .eq("id", input.contactId)
    .eq("business_id", input.businessId);

  return avatarPath;
}

async function syncTelegramContactAvatar(input: {
  admin: MessagingDbClient;
  businessId: string;
  contactId: string;
  botToken: string;
  telegramUserId: number;
}): Promise<string | null> {
  const photoResult = await getTelegramUserProfilePhotoFileId(
    input.botToken,
    input.telegramUserId,
  );

  if (!photoResult.success) {
    return null;
  }

  const downloaded = await downloadTelegramFile(
    input.botToken,
    photoResult.fileId,
    "avatar.jpg",
  );

  if (!downloaded.success) {
    return null;
  }

  return persistContactAvatar({
    admin: input.admin,
    businessId: input.businessId,
    contactId: input.contactId,
    buffer: downloaded.buffer,
    mimeType: downloaded.mimeType,
  });
}

export async function syncContactAvatarOnInboundMessage(input: {
  admin: MessagingDbClient;
  businessId: string;
  contactId: string;
  channel: MessagingChannel;
  avatarUrl?: string | null;
  avatarSyncedAt?: string | null;
  telegram?: {
    botToken: string;
    userId: number;
  };
}): Promise<void> {
  if (!shouldSyncAvatar(input.avatarUrl, input.avatarSyncedAt)) {
    return;
  }

  try {
    if (input.channel === "telegram" && input.telegram) {
      await syncTelegramContactAvatar({
        admin: input.admin,
        businessId: input.businessId,
        contactId: input.contactId,
        botToken: input.telegram.botToken,
        telegramUserId: input.telegram.userId,
      });
      return;
    }
  } catch (error) {
    console.error("[contact-avatar] sync failed:", error);
  }
}

export async function scheduleContactAvatarSync(input: {
  admin: MessagingDbClient;
  businessId: string;
  contactId: string;
  channel: MessagingChannel;
  telegram?: {
    botToken: string;
    userId: number;
  };
}): Promise<void> {
  const { data } = await input.admin
    .from("contacts")
    .select("avatar_url, avatar_synced_at")
    .eq("id", input.contactId)
    .eq("business_id", input.businessId)
    .maybeSingle();

  await syncContactAvatarOnInboundMessage({
    admin: input.admin,
    businessId: input.businessId,
    contactId: input.contactId,
    channel: input.channel,
    avatarUrl: data?.avatar_url,
    avatarSyncedAt: data?.avatar_synced_at,
    telegram: input.telegram,
  });
}
