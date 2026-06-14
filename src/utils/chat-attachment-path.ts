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
