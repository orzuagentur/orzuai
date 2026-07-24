import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ICONIFY_API,
  SAFE_ICONIFY_SETS,
  iconifySvgUrl,
  isSafeIconifyPrefix,
} from "@/lib/iconify-safe";

export const runtime = "nodejs";

type IconifyCollectionMeta = {
  name?: string;
  total?: number;
  samples?: string[];
  license?: { spdx?: string; title?: string; url?: string };
  hidden?: boolean;
};

/**
 * GET /api/iconify/collections
 * Only curated license-safe Iconify sets (Lucide, Heroicons, Tabler, Phosphor, MDI).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let remote: Record<string, IconifyCollectionMeta> = {};
  try {
    const res = await fetch(`${ICONIFY_API}/collections`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      remote = (await res.json()) as Record<string, IconifyCollectionMeta>;
    }
  } catch {
    /* fall back to static allowlist totals */
  }

  const items = SAFE_ICONIFY_SETS.map((set) => {
    const meta = remote[set.prefix] || {};
    const sample = meta.samples?.[0] || null;
    return {
      prefix: set.prefix,
      label: set.label,
      family: set.family,
      license: set.license,
      licenseUrl: set.licenseUrl,
      homepage: set.homepage,
      notes: set.notes || null,
      total: meta.total ?? null,
      sample,
      thumbUrl: sample ? iconifySvgUrl(set.prefix, sample) : null,
      safe: isSafeIconifyPrefix(set.prefix),
      remoteLicense: meta.license?.spdx || null,
    };
  }).filter((item) => {
    // Drop if Iconify reports a conflicting unsafe license (defense in depth)
    if (
      item.remoteLicense &&
      item.remoteLicense !== item.license &&
      !["MIT", "ISC", "Apache-2.0", "CC0-1.0"].includes(item.remoteLicense)
    ) {
      return false;
    }
    return true;
  });

  return NextResponse.json({
    items,
    policy:
      "Only MIT / ISC / Apache-2.0 curated sets. See scripts/list-safe-iconify-sets.js",
  });
}
