import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ICONIFY_API,
  iconifySvgUrl,
  isSafeIconifyPrefix,
} from "@/lib/iconify-safe";
import {
  UNSPLASH_API,
  mapUnsplashPhoto,
  unsplashAccessKey,
  unsplashAuthHeaders,
} from "@/lib/unsplash";

export type ResolvedImage = {
  src: string;
  alt: string;
  credit?: string;
  creditUrl?: string;
  provider: "unsplash" | "pexels";
  downloadLocation?: string;
};

export type ResolvedEmoji = {
  src: string;
  emoji: string;
  label: string;
  hex?: string;
};

export type ResolvedIcon = {
  iconId: string;
  svgUrl: string;
};

const ICON_FALLBACKS: Record<string, string> = {
  growth: "lucide:trending-up",
  money: "lucide:badge-dollar-sign",
  idea: "lucide:lightbulb",
  rocket: "lucide:rocket",
  shield: "lucide:shield-check",
  users: "lucide:users",
  globe: "lucide:globe",
  chart: "lucide:chart-line",
  check: "lucide:circle-check",
  star: "lucide:star",
  target: "lucide:target",
  lock: "lucide:lock",
  mail: "lucide:mail",
  phone: "lucide:phone",
  calendar: "lucide:calendar",
  zap: "lucide:zap",
  brain: "lucide:brain",
  camera: "lucide:camera",
  heart: "lucide:heart",
  play: "lucide:play",
  settings: "lucide:settings",
  shopping: "lucide:shopping-cart",
};

function cleanQuery(q: string): string {
  return String(q || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export async function resolveStockImage(
  query: string,
  preferred: "unsplash" | "pexels" | "auto" = "auto",
): Promise<ResolvedImage | null> {
  const q = cleanQuery(query) || "cinematic abstract";
  const order: Array<"unsplash" | "pexels"> =
    preferred === "pexels"
      ? ["pexels", "unsplash"]
      : preferred === "unsplash"
        ? ["unsplash", "pexels"]
        : ["unsplash", "pexels"];

  for (const provider of order) {
    try {
      if (provider === "unsplash") {
        const key = unsplashAccessKey();
        if (!key) continue;
        const url = new URL(`${UNSPLASH_API}/search/photos`);
        url.searchParams.set("query", q);
        url.searchParams.set("per_page", "8");
        url.searchParams.set("orientation", "landscape");
        url.searchParams.set("content_filter", "high");
        const res = await fetch(url, {
          headers: unsplashAuthHeaders(),
          cache: "no-store",
        });
        const data = await res.json();
        const first = (data.results || [])[0];
        if (!first) continue;
        const mapped = mapUnsplashPhoto(first);
        if (!mapped) continue;
        return {
          src: mapped.urls.regular || mapped.urls.small,
          alt: mapped.alt || q,
          credit: mapped.photographer.name,
          creditUrl: mapped.photographer.profileUrl,
          provider: "unsplash",
          downloadLocation: mapped.downloadLocation,
        };
      }

      const pexelsKey = String(process.env.PEXELS_API_KEY || "").trim();
      if (!pexelsKey) continue;
      const params = new URLSearchParams({
        query: q,
        per_page: "8",
        orientation: "landscape",
      });
      const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
        headers: { Authorization: pexelsKey },
        cache: "no-store",
      });
      const data = await res.json();
      const photo = (data.photos || [])[0];
      if (!photo?.src) continue;
      return {
        src:
          photo.src.large2x ||
          photo.src.large ||
          photo.src.medium ||
          photo.src.original,
        alt: photo.alt || q,
        credit: photo.photographer,
        creditUrl: photo.photographer_url,
        provider: "pexels",
      };
    } catch (err) {
      console.warn(`[AI_PRES] ${provider} image failed:`, err);
    }
  }
  return null;
}

export async function resolveOpenMoji(
  sb: SupabaseClient,
  query: string,
): Promise<ResolvedEmoji | null> {
  const q = cleanQuery(query).toLowerCase();
  if (!q) return null;
  const terms = Array.from(
    new Set(
      [q, ...q.split(/[^a-z0-9]+/).filter((t) => t.length > 2)].slice(0, 6),
    ),
  );

  for (const term of terms) {
    try {
      const pattern = `%${term.replace(/[%_]/g, "")}%`;
      for (const column of ["name", "tags", "filename"] as const) {
        const { data } = await sb
          .table("openmoji")
          .select("hex,public_url,name,filename")
          .ilike(column, pattern)
          .limit(6);
        const row = (data || []).find((r) => r.public_url);
        if (row?.public_url) {
          return {
            src: String(row.public_url),
            emoji: "",
            label: String(row.name || term),
            hex: String(row.hex || ""),
          };
        }
      }
    } catch (err) {
      console.warn("[AI_PRES] openmoji failed:", err);
      return null;
    }
  }
  return null;
}

function coloredIconUrl(prefix: string, name: string, colorHex: string): string {
  const color = colorHex.replace("#", "");
  const base = iconifySvgUrl(prefix, name, 256);
  return base.replace(/color=%23[0-9a-fA-F]{3,8}/, `color=%23${color}`);
}

export async function resolveIconifyIcon(
  query: string,
  color = "#F8FAFC",
): Promise<ResolvedIcon | null> {
  const q = cleanQuery(query).toLowerCase();
  if (!q) return null;

  for (const [token, iconId] of Object.entries(ICON_FALLBACKS)) {
    if (q.includes(token) || token.includes(q)) {
      const [prefix, name] = iconId.split(":");
      return {
        iconId,
        svgUrl: coloredIconUrl(prefix, name, color),
      };
    }
  }

  try {
    const url = new URL(`${ICONIFY_API}/search`);
    url.searchParams.set("query", q);
    url.searchParams.set("limit", "48");
    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json();
    const icons: string[] = Array.isArray(data.icons) ? data.icons : [];
    for (const id of icons) {
      const [prefix, name] = String(id).split(":");
      if (!prefix || !name || !isSafeIconifyPrefix(prefix)) continue;
      return {
        iconId: `${prefix}:${name}`,
        svgUrl: coloredIconUrl(prefix, name, color),
      };
    }
  } catch (err) {
    console.warn("[AI_PRES] iconify search failed:", err);
  }

  return {
    iconId: "lucide:sparkles",
    svgUrl: coloredIconUrl("lucide", "sparkles", color),
  };
}

type RawEl = Record<string, unknown>;

/** Resolve media queries on an AI plan in-place (adds src / svgUrl fields). */
export async function enrichAiPresentationPlan(
  plan: Record<string, unknown>,
  sb: SupabaseClient,
): Promise<Record<string, unknown>> {
  const slides = Array.isArray(plan.slides) ? plan.slides : [];
  const usedImageUrls = new Set<string>();

  for (const slide of slides) {
    if (!slide || typeof slide !== "object") continue;
    const s = slide as Record<string, unknown>;
    const layout = String(s.layout || "content");

    const bgQ = cleanQuery(String(s.backgroundImageQuery || ""));
    if (bgQ || layout === "cover") {
      const img = await resolveStockImage(
        bgQ || String(s.name || "abstract gradient texture"),
        "unsplash",
      );
      if (img && !usedImageUrls.has(img.src)) {
        s.backgroundImage = img.src;
        s.backgroundCredit = img.credit;
        usedImageUrls.add(img.src);
      }
    }

    const elements = Array.isArray(s.elements) ? s.elements : [];
    const nextEls: RawEl[] = [];
    for (const raw of elements) {
      if (!raw || typeof raw !== "object") continue;
      const el = { ...(raw as RawEl) };
      const type = String(el.type || "");

      if (type === "image") {
        const query = cleanQuery(String(el.query || el.alt || "business"));
        const preferred =
          el.provider === "pexels" || el.provider === "unsplash"
            ? (el.provider as "pexels" | "unsplash")
            : "auto";
        let img = await resolveStockImage(query, preferred);
        if (img && usedImageUrls.has(img.src)) {
          img = await resolveStockImage(`${query} detail`, preferred);
        }
        if (img) {
          usedImageUrls.add(img.src);
          el.src = img.src;
          el.alt = img.alt;
          el.credit = img.credit;
          el.creditUrl = img.creditUrl;
          el.provider = img.provider;
          el.downloadLocation = img.downloadLocation;
          nextEls.push(el);
        }
        continue;
      }

      if (type === "emoji") {
        const query = cleanQuery(String(el.query || el.label || "star"));
        const emoji = await resolveOpenMoji(sb, query);
        if (emoji) {
          el.src = emoji.src;
          el.label = emoji.label;
          el.emoji = emoji.emoji || "✨";
          nextEls.push(el);
        }
        continue;
      }

      if (type === "icon") {
        const query = cleanQuery(String(el.query || el.iconId || "sparkles"));
        const color = String(el.color || "#F8FAFC");
        const icon = await resolveIconifyIcon(query, color);
        if (icon) {
          el.iconId = icon.iconId;
          el.svgUrl = icon.svgUrl;
          nextEls.push(el);
        }
        continue;
      }

      nextEls.push(el);
    }
    s.elements = nextEls;
  }

  plan.slides = slides;
  return plan;
}
