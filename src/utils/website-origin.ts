export function normalizeWebsiteOrigin(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.origin;
  } catch {
    return null;
  }
}

export function extractRequestWebsiteOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");

  if (origin) {
    return normalizeWebsiteOrigin(origin);
  }

  const referer = request.headers.get("referer");

  if (referer) {
    return normalizeWebsiteOrigin(referer);
  }

  return null;
}
