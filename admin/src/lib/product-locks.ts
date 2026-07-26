/** Shared with web - keep in sync with web/src/lib/product-locks.ts */

export const PRODUCT_LOCK_FEATURES = [
  {
    id: "content",
    label: "Content studio",
    description: "Creators -> Content (open videos in pro editor)",
    group: "Deferred creator tools",
    defaultLocked: true,
  },
  {
    id: "photo_editor",
    label: "Photo editor",
    description: "Creators -> Photo editor workspace",
    group: "Deferred creator tools",
    defaultLocked: true,
  },
  {
    id: "video_editor",
    label: "Video editor",
    description: "Edit AI-created videos (/dashboard/editor)",
    group: "Core YouTube workflow",
    defaultLocked: false,
  },
  {
    id: "ai_presentation",
    label: "AI Presentation",
    description: "Prompt -> presentation generator (opens in Presentation editor)",
    group: "Deferred creator tools",
    defaultLocked: true,
  },
  {
    id: "presentation_editor",
    label: "Presentation editor",
    description: "Manual slide editor and presentation exports",
    group: "Deferred creator tools",
    defaultLocked: true,
  },
  {
    id: "asset_libraries",
    label: "Asset libraries",
    description: "Photos, videos, 3D models, HDRIs, textures, emojis, and icons",
    group: "Deferred creator tools",
    defaultLocked: true,
  },
] as const;

export type ProductLockId = (typeof PRODUCT_LOCK_FEATURES)[number]["id"];

export type ProductLocksMap = Partial<Record<ProductLockId, boolean>>;

export const DEFAULT_PRODUCT_LOCKS: Record<ProductLockId, boolean> =
  PRODUCT_LOCK_FEATURES.reduce(
    (acc, feature) => ({
      ...acc,
      [feature.id]: Boolean(feature.defaultLocked),
    }),
    {} as Record<ProductLockId, boolean>,
  );

export function resolvedProductLocks(
  locks: ProductLocksMap | null | undefined,
): Record<ProductLockId, boolean> {
  return {
    ...DEFAULT_PRODUCT_LOCKS,
    ...(locks || {}),
  };
}

export function isFeatureLocked(
  locks: ProductLocksMap | null | undefined,
  id: ProductLockId,
): boolean {
  return Boolean(resolvedProductLocks(locks)[id]);
}
