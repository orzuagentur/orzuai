export function getContactInitials(name: string, fallback = "??"): string {
  const trimmed = name.trim();

  if (!trimmed) {
    return fallback;
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }

  return trimmed.slice(0, 2).toUpperCase();
}

export function resolveAvatarUrlFromMap(
  avatarPath: string | null | undefined,
  signedUrlMap: Map<string, string>,
): string | null {
  if (!avatarPath?.trim()) {
    return null;
  }

  return signedUrlMap.get(avatarPath) ?? null;
}
