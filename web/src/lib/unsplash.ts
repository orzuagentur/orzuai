/**
 * Unsplash API helpers — Creators library (guideline-compliant).
 * Docs: https://unsplash.com/documentation
 * Guidelines: hotlink urls.*, ping download_location, attribute with utm.
 */

export const UNSPLASH_API = "https://api.unsplash.com";

/** utm_source must match the app (not the word "Unsplash"). */
export const UNSPLASH_UTM_SOURCE =
  process.env.NEXT_PUBLIC_UNSPLASH_UTM_SOURCE?.trim() || "orzuai";

export type UnsplashPhotoCard = {
  id: string;
  description: string | null;
  alt: string;
  width: number;
  height: number;
  color: string | null;
  /** Hotlinked — use only these URLs (guideline). */
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  /** Pass to /api/unsplash/download when user “downloads” / picks the photo. */
  downloadLocation: string;
  photographer: {
    name: string;
    username: string;
    profileUrl: string;
    avatarUrl: string | null;
  };
  unsplashUrl: string;
  likes: number;
};

export type UnsplashTopicCard = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  count: number;
  thumbUrl: string | null;
};

export function unsplashAccessKey(): string {
  return String(process.env.UNSPLASH_ACCESS_KEY || "").trim();
}

export function withUnsplashUtm(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", UNSPLASH_UTM_SOURCE);
    u.searchParams.set("utm_medium", "referral");
    return u.toString();
  } catch {
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}utm_source=${encodeURIComponent(UNSPLASH_UTM_SOURCE)}&utm_medium=referral`;
  }
}

export function unsplashAuthHeaders(): HeadersInit {
  const key = unsplashAccessKey();
  if (!key) throw new Error("UNSPLASH_ACCESS_KEY is not configured");
  return {
    Authorization: `Client-ID ${key}`,
    "Accept-Version": "v1",
  };
}

type RawUser = {
  name?: string;
  username?: string;
  links?: { html?: string };
  profile_image?: { medium?: string; small?: string };
};

type RawPhoto = {
  id?: string;
  description?: string | null;
  alt_description?: string | null;
  width?: number;
  height?: number;
  color?: string | null;
  likes?: number;
  urls?: {
    raw?: string;
    full?: string;
    regular?: string;
    small?: string;
    thumb?: string;
  };
  links?: {
    html?: string;
    download_location?: string;
  };
  user?: RawUser;
};

export function mapUnsplashPhoto(raw: RawPhoto): UnsplashPhotoCard | null {
  const id = String(raw.id || "").trim();
  const urls = raw.urls;
  const downloadLocation = String(raw.links?.download_location || "").trim();
  if (!id || !urls?.regular || !urls?.full || !downloadLocation) return null;

  const username = String(raw.user?.username || "").trim() || "unsplash";
  const name = String(raw.user?.name || username).trim();
  const profileHtml = String(raw.user?.links?.html || "").trim();
  const profileUrl = withUnsplashUtm(
    profileHtml || `https://unsplash.com/@${username}`,
  );
  const photoHtml = String(raw.links?.html || "").trim();
  const unsplashUrl = withUnsplashUtm(
    photoHtml || `https://unsplash.com/photos/${id}`,
  );

  return {
    id,
    description: raw.description ? String(raw.description) : null,
    alt: String(raw.alt_description || raw.description || `Photo by ${name}`),
    width: Number(raw.width || 0),
    height: Number(raw.height || 0),
    color: raw.color ? String(raw.color) : null,
    urls: {
      raw: String(urls.raw || urls.full),
      full: String(urls.full),
      regular: String(urls.regular),
      small: String(urls.small || urls.regular),
      thumb: String(urls.thumb || urls.small || urls.regular),
    },
    downloadLocation,
    photographer: {
      name,
      username,
      profileUrl,
      avatarUrl: raw.user?.profile_image?.medium
        ? String(raw.user.profile_image.medium)
        : raw.user?.profile_image?.small
          ? String(raw.user.profile_image.small)
          : null,
    },
    unsplashUrl,
    likes: Number(raw.likes || 0),
  };
}

export function isAllowedUnsplashDownloadLocation(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname === "api.unsplash.com" &&
      u.pathname.includes("/photos/") &&
      u.pathname.includes("/download")
    );
  } catch {
    return false;
  }
}
