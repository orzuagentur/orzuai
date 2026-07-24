/**
 * Reviewed Iconify icon sets that are license-safe for OrzuAi creators library.
 *
 * Rules (see scripts/list-safe-iconify-sets.js):
 * - Only open permissive licenses: MIT, ISC, Apache-2.0, CC0-1.0
 * - Explicit product allowlist (Lucide, Heroicons, Tabler, Phosphor, MDI)
 * - Exclude GPL/AGPL/proprietary/unknown SPDX
 * - Exclude “hidden” / incomplete Iconify collections
 * - Prefer official prefixes from Iconify public API
 */

export type SafeIconifyLicense = "MIT" | "ISC" | "Apache-2.0" | "CC0-1.0";

export type SafeIconifySet = {
  prefix: string;
  label: string;
  family: "lucide" | "heroicons" | "tabler" | "phosphor" | "mdi";
  license: SafeIconifyLicense;
  /** Official project / license page */
  licenseUrl: string;
  homepage: string;
  notes?: string;
};

/** SPDX strings we accept as redistribution-safe for SVG icons in-product. */
export const SAFE_ICONIFY_SPDX = new Set<string>([
  "MIT",
  "ISC",
  "Apache-2.0",
  "CC0-1.0",
]);

/** SPDX we never ship (copyleft / unclear for commercial SVG redistribution). */
export const UNSAFE_ICONIFY_SPDX = new Set<string>([
  "GPL-2.0",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "AGPL-3.0",
  "AGPL-3.0-only",
  "AGPL-3.0-or-later",
  "LGPL-2.1",
  "LGPL-3.0",
  "SSPL-1.0",
  "BUSL-1.1",
  "UNLICENSED",
  "LicenseRef-Proprietary",
]);

/**
 * Curated sets requested for Creators → Icons.
 * Only these appear in the product filter (even if other MIT sets exist on Iconify).
 */
export const SAFE_ICONIFY_SETS: SafeIconifySet[] = [
  {
    prefix: "lucide",
    label: "Lucide",
    family: "lucide",
    license: "ISC",
    licenseUrl: "https://lucide.dev/license",
    homepage: "https://lucide.dev",
  },
  {
    prefix: "lucide-lab",
    label: "Lucide Lab",
    family: "lucide",
    license: "ISC",
    licenseUrl: "https://github.com/lucide-icons/lucide-lab",
    homepage: "https://lucide.dev",
    notes: "Experimental Lucide icons; same ISC license family.",
  },
  {
    prefix: "heroicons",
    label: "Heroicons",
    family: "heroicons",
    license: "MIT",
    licenseUrl: "https://github.com/tailwindlabs/heroicons/blob/master/LICENSE",
    homepage: "https://heroicons.com",
  },
  {
    prefix: "heroicons-outline",
    label: "Heroicons v1 Outline",
    family: "heroicons",
    license: "MIT",
    licenseUrl: "https://github.com/tailwindlabs/heroicons/blob/master/LICENSE",
    homepage: "https://heroicons.com",
  },
  {
    prefix: "heroicons-solid",
    label: "Heroicons v1 Solid",
    family: "heroicons",
    license: "MIT",
    licenseUrl: "https://github.com/tailwindlabs/heroicons/blob/master/LICENSE",
    homepage: "https://heroicons.com",
  },
  {
    prefix: "tabler",
    label: "Tabler Icons",
    family: "tabler",
    license: "MIT",
    licenseUrl: "https://github.com/tabler/tabler-icons/blob/main/LICENSE",
    homepage: "https://tabler.io/icons",
  },
  {
    prefix: "ph",
    label: "Phosphor",
    family: "phosphor",
    license: "MIT",
    licenseUrl: "https://github.com/phosphor-icons/core/blob/main/LICENSE",
    homepage: "https://phosphoricons.com",
  },
  {
    prefix: "mdi",
    label: "Material Design Icons",
    family: "mdi",
    license: "Apache-2.0",
    licenseUrl:
      "https://github.com/Templarian/MaterialDesign/blob/master/LICENSE",
    homepage: "https://pictogrammers.com/library/mdi/",
    notes: "Apache-2.0 — keep NOTICE/attribution when redistributing packs.",
  },
];

export const SAFE_ICONIFY_PREFIXES = new Set(
  SAFE_ICONIFY_SETS.map((s) => s.prefix),
);

export function isSafeIconifyPrefix(prefix: string): boolean {
  return SAFE_ICONIFY_PREFIXES.has(String(prefix || "").trim());
}

export function getSafeIconifySet(prefix: string): SafeIconifySet | undefined {
  return SAFE_ICONIFY_SETS.find((s) => s.prefix === prefix);
}

export function iconifySvgUrl(prefix: string, name: string, size = 128): string {
  const p = encodeURIComponent(prefix);
  const n = encodeURIComponent(name);
  const s = Math.max(32, Math.min(256, size));
  // Larger rasterized SVG for crisp grid tiles on dark UI
  return `https://api.iconify.design/${p}/${n}.svg?height=${s}&width=${s}&color=%23e8e8ea`;
}

export const ICONIFY_API = "https://api.iconify.design";
