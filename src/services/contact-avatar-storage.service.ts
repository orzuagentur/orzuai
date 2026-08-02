import "server-only";

import {
  getMediaSignedUrl,
  newMediaObjectRef,
  putMediaObject,
} from "@/lib/storage/media-storage";

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
  const logicalKey = buildContactAvatarPath(
    input.businessId,
    input.contactId,
    extensionFromMimeType(input.mimeType),
  );
  const ref = newMediaObjectRef(logicalKey);

  const ok = await putMediaObject({
    ref,
    body: input.buffer,
    contentType: input.mimeType || "image/jpeg",
    upsert: true,
  });

  if (!ok) {
    console.error("[contact-avatar] upload failed for ref:", ref);
    return null;
  }

  return ref;
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

  return getMediaSignedUrl(path, expiresIn);
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
