/** Shared library asset kinds (safe for server + client). */

export const STUDIO_KINDS = [
  "models",
  "hdris",
  "textures",
  "photos",
  "videos",
  "emojis",
  "icons",
] as const;

export type StudioKind = (typeof STUDIO_KINDS)[number];

const KIND_SET = new Set<string>(STUDIO_KINDS);

export function isStudioKind(raw: string): raw is StudioKind {
  return KIND_SET.has(raw);
}
