/** Optional CDN origin for Supabase Storage signed URLs. */
export function applyMediaCdnUrl(signedUrl: string): string {
  const cdnOrigin = process.env.MEDIA_CDN_URL?.trim();

  if (!cdnOrigin) {
    return signedUrl;
  }

  try {
    const source = new URL(signedUrl);
    const target = new URL(cdnOrigin);
    source.protocol = target.protocol;
    source.host = target.host;
    return source.toString();
  } catch {
    return signedUrl;
  }
}
