export function buildChatAttachmentStoragePath(
  businessId: string,
  conversationId: string,
  fileName: string,
): string {
  const extension = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf("."))
    : "";

  return `${businessId}/${conversationId}/${Date.now()}-${crypto.randomUUID()}${extension}`;
}

/** Stable inbound path — same message_id overwrites on hydration retry (no orphan files). */
export function buildInboundAttachmentStoragePath(
  businessId: string,
  conversationId: string,
  messageId: string,
  fileName: string,
): string {
  const extension = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf("."))
    : "";

  return `${businessId}/${conversationId}/inbound/${messageId}${extension}`;
}

export function isValidChatAttachmentStoragePath(
  path: string,
  businessId: string,
  conversationId: string,
): boolean {
  if (!path || path.includes("..")) {
    return false;
  }

  const prefix = `${businessId}/${conversationId}/`;

  return path.startsWith(prefix) && path.length > prefix.length;
}

export function buildThumbnailStoragePath(storagePath: string): string {
  const slashIndex = storagePath.lastIndexOf("/");

  if (slashIndex === -1) {
    return `thumbs/${storagePath}.jpg`;
  }

  const directory = storagePath.slice(0, slashIndex);
  const fileName = storagePath.slice(slashIndex + 1);
  const baseName = fileName.includes(".")
    ? fileName.slice(0, fileName.lastIndexOf("."))
    : fileName;

  return `${directory}/thumbs/${baseName}.jpg`;
}
