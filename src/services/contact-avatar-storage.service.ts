import "server-only";

import { CHAT_ATTACHMENTS_BUCKET } from "@/features/chats/chat-attachments";
import { createAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

function buildContactAvatarPath(
  businessId: string,
  contactId: string,
  extension: string,
): string {
  const normalizedExtension = extension.startsWith(".")
    ? extension
    : `.${extension}`;

  return `${businessId}/contact-avatars/${contactId}${normalizedExtension}`;
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType.includes("png")) {
    return ".png";
  }

  if (mimeType.includes("webp")) {
    return ".webp";
  }

  if (mimeType.includes("gif")) {
    return ".gif";
  }

  return ".jpg";
}

export async function uploadContactAvatarBuffer(input: {
  businessId: string;
  contactId: string;
  buffer: Buffer;
  mimeType: string;
}): Promise<string | null> {
  const admin = createAdminClient();
  const path = buildContactAvatarPath(
    input.businessId,
    input.contactId,
    extensionFromMimeType(input.mimeType),
  );

  const { error } = await admin.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(path, input.buffer, {
      contentType: input.mimeType || "image/jpeg",
      upsert: true,
    });

  if (error) {
    console.error("[contact-avatar] upload failed:", error.message);
    return null;
  }

  return path;
}

export async function getContactAvatarSignedUrl(
  path: string | null | undefined,
  expiresIn = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  if (!path?.trim()) {
    return null;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("[contact-avatar] signed URL failed:", error.message);
    return null;
  }

  return data.signedUrl;
}

export async function resolveContactAvatarSignedUrls(
  paths: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const uniquePaths = [
    ...new Set(
      paths.filter(
        (path): path is string =>
          Boolean(path?.trim()) && !path!.startsWith("http"),
      ),
    ),
  ];
  const resolved = new Map<string, string>();

  await Promise.all(
    uniquePaths.map(async (path) => {
      const signedUrl = await getContactAvatarSignedUrl(path);

      if (signedUrl) {
        resolved.set(path, signedUrl);
      }
    }),
  );

  for (const path of paths) {
    if (
      path?.startsWith("http://") ||
      path?.startsWith("https://")
    ) {
      resolved.set(path, path);
    }
  }

  return resolved;
}
