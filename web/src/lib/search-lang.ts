/**
 * Multilingual Creators search: detect query language and normalize to English
 * for catalogs that are English-indexed (Unsplash works better with en;
 * OpenMoji / Iconify / Poly Haven names are English).
 */

const TRANSLATE_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

/** Unsplash search `lang` allowlist (ISO 639-1). */
const UNSPLASH_LANGS = new Set([
  "af", "am", "ar", "az", "be", "bg", "bn", "bs", "ca", "ceb", "co", "cs", "cy",
  "da", "de", "el", "en", "eo", "es", "et", "eu", "fa", "fi", "fr", "fy", "ga",
  "gd", "gl", "gu", "ha", "haw", "he", "hi", "hmn", "hr", "ht", "hu", "hy", "id",
  "ig", "is", "it", "ja", "jw", "ka", "kk", "km", "kn", "ko", "ku", "ky", "la",
  "lb", "lo", "lt", "lv", "mg", "mi", "mk", "ml", "mn", "mr", "ms", "mt", "my",
  "ne", "nl", "no", "ny", "pa", "pl", "ps", "pt", "ro", "ru", "sd", "si", "sk",
  "sl", "sm", "sn", "so", "sq", "sr", "st", "su", "sv", "sw", "ta", "te", "tg",
  "th", "tl", "tr", "uk", "ur", "uz", "vi", "xh", "yi", "yo", "zh", "zu",
]);

export type NormalizedSearchQuery = {
  original: string;
  /** Best-effort ISO 639-1 of the user query */
  lang: string;
  /** English query for English-indexed catalogs / Unsplash */
  en: string;
  translated: boolean;
};

const cache = new Map<string, NormalizedSearchQuery>();

/** Fast script / diacritic heuristics (no network). */
export function detectSearchLang(text: string): string {
  const t = text.trim();
  if (!t) return "en";
  if (/[\u0400-\u04FF]/.test(t)) {
    if (/[іїєґІЇЄҐ]/.test(t)) return "uk";
    return "ru";
  }
  if (/[\u0600-\u06FF]/.test(t)) return "ar";
  if (/[\u0590-\u05FF]/.test(t)) return "he";
  if (/[\u3040-\u30ff\u31f0-\u31ff]/.test(t)) return "ja";
  if (/[\uac00-\ud7af]/.test(t)) return "ko";
  if (/[\u4e00-\u9fff]/.test(t)) return "zh";
  if (/[\u0900-\u097F]/.test(t)) return "hi";
  if (/[\u0E00-\u0E7F]/.test(t)) return "th";
  if (/[äöüßÄÖÜ]/.test(t)) return "de";
  if (/[àâæçéèêëïîôœùûüÿÀÂÆÇÉÈÊËÏÎÔŒÙÛÜŸ]/.test(t)) return "fr";
  if (/[ñáéíóúü¿¡ÑÁÉÍÓÚÜ]/.test(t)) return "es";
  if (/[ãõáàâéêíóôõúçÃÕÁÀÂÉÊÍÓÔÕÚÇ]/.test(t)) return "pt";
  if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(t)) return "pl";
  if (/[ğışçöüĞİŞÇÖÜ]/.test(t)) return "tr";
  if (/[àèéìíîòóùúÀÈÉÌÍÎÒÓÙÚ]/.test(t)) return "it";
  return "en";
}

function looksPlainEnglish(text: string): boolean {
  // ASCII letters/digits/basic punctuation only → treat as English search terms
  return /^[a-zA-Z0-9\s\-_'",.!?:;#&+/()]+$/.test(text.trim());
}

/**
 * Normalize a user search query for Creators libraries.
 * Non-English → English via OpenAI (if key present), else original + detected lang.
 */
export async function normalizeSearchQuery(
  raw: string,
): Promise<NormalizedSearchQuery> {
  const original = String(raw || "").trim().slice(0, 120);
  if (!original) {
    return { original: "", lang: "en", en: "", translated: false };
  }

  const cached = cache.get(original.toLowerCase());
  if (cached) return cached;

  const heuristic = detectSearchLang(original);
  if (heuristic === "en" && looksPlainEnglish(original)) {
    const row: NormalizedSearchQuery = {
      original,
      lang: "en",
      en: original,
      translated: false,
    };
    cache.set(original.toLowerCase(), row);
    return row;
  }

  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    const row: NormalizedSearchQuery = {
      original,
      lang: heuristic,
      en: original,
      translated: false,
    };
    cache.set(original.toLowerCase(), row);
    return row;
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TRANSLATE_MODEL,
        temperature: 0,
        max_tokens: 80,
        messages: [
          {
            role: "system",
            content:
              'Normalize a stock-photo / media search query. Reply with ONLY compact JSON: {"lang":"ISO-639-1","en":"English search keywords"}. Keep en short (2–6 words), no quotes outside JSON. If already English, lang=en and en is the cleaned query.',
          },
          { role: "user", content: original },
        ],
      }),
    });
    if (!res.ok) throw new Error(`openai ${res.status}`);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = String(data.choices?.[0]?.message?.content || "").trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch
      ? (JSON.parse(jsonMatch[0]) as { lang?: string; en?: string })
      : null;
    let lang = String(parsed?.lang || heuristic)
      .trim()
      .toLowerCase()
      .slice(0, 8);
    if (!UNSPLASH_LANGS.has(lang)) lang = heuristic;
    const en = String(parsed?.en || original).trim().slice(0, 120) || original;
    const row: NormalizedSearchQuery = {
      original,
      lang,
      en,
      translated: en.toLowerCase() !== original.toLowerCase(),
    };
    cache.set(original.toLowerCase(), row);
    if (cache.size > 500) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    return row;
  } catch {
    return {
      original,
      lang: heuristic,
      en: original,
      translated: false,
    };
  }
}

export function unsplashSearchLang(lang: string): string | null {
  const code = String(lang || "en").toLowerCase();
  if (!UNSPLASH_LANGS.has(code)) return null;
  return code;
}
