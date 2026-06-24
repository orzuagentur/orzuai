export const MULTILINGUAL_LANGUAGE_VALUE = "Multilingual";

export type AiReplyLanguageOption = {
  value: string;
  label: string;
  nativeLabel?: string;
};

const LANGUAGE_ENTRIES: Array<{ value: string; label: string; nativeLabel?: string }> = [
  { value: "Afrikaans", label: "Afrikaans" },
  { value: "Albanian", label: "Albanian", nativeLabel: "Shqip" },
  { value: "Amharic", label: "Amharic", nativeLabel: "አማርኛ" },
  { value: "Arabic", label: "Arabic", nativeLabel: "العربية" },
  { value: "Armenian", label: "Armenian", nativeLabel: "Հայերեն" },
  { value: "Azerbaijani", label: "Azerbaijani", nativeLabel: "Azərbaycan" },
  { value: "Basque", label: "Basque", nativeLabel: "Euskara" },
  { value: "Belarusian", label: "Belarusian", nativeLabel: "Беларуская" },
  { value: "Bengali", label: "Bengali", nativeLabel: "বাংলা" },
  { value: "Bosnian", label: "Bosnian", nativeLabel: "Bosanski" },
  { value: "Bulgarian", label: "Bulgarian", nativeLabel: "Български" },
  { value: "Burmese", label: "Burmese", nativeLabel: "မြန်မာ" },
  { value: "Catalan", label: "Catalan", nativeLabel: "Català" },
  { value: "Chinese (Simplified)", label: "Chinese (Simplified)", nativeLabel: "简体中文" },
  { value: "Chinese (Traditional)", label: "Chinese (Traditional)", nativeLabel: "繁體中文" },
  { value: "Croatian", label: "Croatian", nativeLabel: "Hrvatski" },
  { value: "Czech", label: "Czech", nativeLabel: "Čeština" },
  { value: "Danish", label: "Danish", nativeLabel: "Dansk" },
  { value: "Dutch", label: "Dutch", nativeLabel: "Nederlands" },
  { value: "English", label: "English" },
  { value: "Estonian", label: "Estonian", nativeLabel: "Eesti" },
  { value: "Filipino", label: "Filipino" },
  { value: "Finnish", label: "Finnish", nativeLabel: "Suomi" },
  { value: "French", label: "French", nativeLabel: "Français" },
  { value: "Galician", label: "Galician", nativeLabel: "Galego" },
  { value: "Georgian", label: "Georgian", nativeLabel: "ქართული" },
  { value: "German", label: "German", nativeLabel: "Deutsch" },
  { value: "Greek", label: "Greek", nativeLabel: "Ελληνικά" },
  { value: "Gujarati", label: "Gujarati", nativeLabel: "ગુજરાતી" },
  { value: "Hebrew", label: "Hebrew", nativeLabel: "עברית" },
  { value: "Hindi", label: "Hindi", nativeLabel: "हिन्दी" },
  { value: "Hungarian", label: "Hungarian", nativeLabel: "Magyar" },
  { value: "Icelandic", label: "Icelandic", nativeLabel: "Íslenska" },
  { value: "Indonesian", label: "Indonesian", nativeLabel: "Bahasa Indonesia" },
  { value: "Irish", label: "Irish", nativeLabel: "Gaeilge" },
  { value: "Italian", label: "Italian", nativeLabel: "Italiano" },
  { value: "Japanese", label: "Japanese", nativeLabel: "日本語" },
  { value: "Javanese", label: "Javanese", nativeLabel: "Basa Jawa" },
  { value: "Kannada", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { value: "Kazakh", label: "Kazakh", nativeLabel: "Қазақ" },
  { value: "Khmer", label: "Khmer", nativeLabel: "ខ្មែរ" },
  { value: "Korean", label: "Korean", nativeLabel: "한국어" },
  { value: "Kurdish", label: "Kurdish", nativeLabel: "Kurdî" },
  { value: "Kyrgyz", label: "Kyrgyz", nativeLabel: "Кыргызча" },
  { value: "Lao", label: "Lao", nativeLabel: "ລາວ" },
  { value: "Latvian", label: "Latvian", nativeLabel: "Latviešu" },
  { value: "Lithuanian", label: "Lithuanian", nativeLabel: "Lietuvių" },
  { value: "Macedonian", label: "Macedonian", nativeLabel: "Македонски" },
  { value: "Malay", label: "Malay", nativeLabel: "Bahasa Melayu" },
  { value: "Malayalam", label: "Malayalam", nativeLabel: "മലയാളം" },
  { value: "Marathi", label: "Marathi", nativeLabel: "मराठी" },
  { value: "Mongolian", label: "Mongolian", nativeLabel: "Монгол" },
  { value: "Nepali", label: "Nepali", nativeLabel: "नेपाली" },
  { value: "Norwegian", label: "Norwegian", nativeLabel: "Norsk" },
  { value: "Pashto", label: "Pashto", nativeLabel: "پښتو" },
  { value: "Persian", label: "Persian", nativeLabel: "فارسی" },
  { value: "Polish", label: "Polish", nativeLabel: "Polski" },
  { value: "Portuguese", label: "Portuguese", nativeLabel: "Português" },
  { value: "Punjabi", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ" },
  { value: "Romanian", label: "Romanian", nativeLabel: "Română" },
  { value: "Russian", label: "Russian", nativeLabel: "Русский" },
  { value: "Serbian", label: "Serbian", nativeLabel: "Српски" },
  { value: "Sinhala", label: "Sinhala", nativeLabel: "සිංහල" },
  { value: "Slovak", label: "Slovak", nativeLabel: "Slovenčina" },
  { value: "Slovenian", label: "Slovenian", nativeLabel: "Slovenščina" },
  { value: "Spanish", label: "Spanish", nativeLabel: "Español" },
  { value: "Swahili", label: "Swahili", nativeLabel: "Kiswahili" },
  { value: "Swedish", label: "Swedish", nativeLabel: "Svenska" },
  { value: "Tamil", label: "Tamil", nativeLabel: "தமிழ்" },
  { value: "Telugu", label: "Telugu", nativeLabel: "తెలుగు" },
  { value: "Thai", label: "Thai", nativeLabel: "ไทย" },
  { value: "Turkish", label: "Turkish", nativeLabel: "Türkçe" },
  { value: "Ukrainian", label: "Ukrainian", nativeLabel: "Українська" },
  { value: "Urdu", label: "Urdu", nativeLabel: "اردو" },
  { value: "Uzbek", label: "Uzbek", nativeLabel: "O'zbek" },
  { value: "Vietnamese", label: "Vietnamese", nativeLabel: "Tiếng Việt" },
  { value: "Welsh", label: "Welsh", nativeLabel: "Cymraeg" },
  { value: "Yiddish", label: "Yiddish", nativeLabel: "ייִדיש" },
];

export const AI_REPLY_LANGUAGE_OPTIONS: AiReplyLanguageOption[] = [
  {
    value: MULTILINGUAL_LANGUAGE_VALUE,
    label: "Multilingual",
    nativeLabel: "Auto-detect",
  },
  ...LANGUAGE_ENTRIES,
];

/** @deprecated Use AI_REPLY_LANGUAGE_OPTIONS */
export const AI_LANGUAGE_OPTIONS = AI_REPLY_LANGUAGE_OPTIONS.map((option) => ({
  value: option.value,
  label:
    option.value === MULTILINGUAL_LANGUAGE_VALUE
      ? option.label
      : option.nativeLabel
        ? `${option.label} (${option.nativeLabel})`
        : option.label,
}));

const LANGUAGE_VALUE_SET = new Set(
  AI_REPLY_LANGUAGE_OPTIONS.map((option) => option.value),
);

export function isValidAiReplyLanguage(value: string): boolean {
  return LANGUAGE_VALUE_SET.has(value.trim());
}

export function formatAiReplyLanguageLabel(value: string): string {
  const option = AI_REPLY_LANGUAGE_OPTIONS.find((item) => item.value === value);
  if (!option) {
    return value;
  }

  if (option.value === MULTILINGUAL_LANGUAGE_VALUE) {
    return option.label;
  }

  return option.nativeLabel
    ? `${option.label} (${option.nativeLabel})`
    : option.label;
}

export function filterAiReplyLanguages(query: string): AiReplyLanguageOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return AI_REPLY_LANGUAGE_OPTIONS;
  }

  return AI_REPLY_LANGUAGE_OPTIONS.filter((option) => {
    const haystack = [
      option.value,
      option.label,
      option.nativeLabel ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export const REPLY_WAIT_MS_OPTIONS = Array.from(
  { length: 14 },
  (_, index) => 1500 + index * 500,
);

export function formatReplyWaitLabel(waitMs: number): string {
  const seconds = waitMs / 1000;
  return Number.isInteger(seconds) ? `${seconds} s` : `${seconds.toFixed(1)} s`;
}
