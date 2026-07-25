/** Shared product feature lock IDs (admin toggles → web gates). */

export const PRODUCT_LOCK_FEATURES = [
  {
    id: "content",
    label: "Content studio",
    description: "Creators → Content (open videos in pro editor)",
  },
  {
    id: "photo_editor",
    label: "Photo editor",
    description: "Creators → Photo editor workspace",
  },
  {
    id: "video_editor",
    label: "Video editor",
    description: "Edit AI-created videos (/dashboard/editor)",
  },
] as const;

export type ProductLockId = (typeof PRODUCT_LOCK_FEATURES)[number]["id"];

export type ProductLocksMap = Partial<Record<ProductLockId, boolean>>;

export function isFeatureLocked(
  locks: ProductLocksMap | null | undefined,
  id: ProductLockId,
): boolean {
  return Boolean(locks?.[id]);
}
