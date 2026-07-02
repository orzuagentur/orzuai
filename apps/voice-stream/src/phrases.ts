const MIN_PHRASE_WORDS = 4;
const FORCE_FLUSH_WORDS = 8;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Extract speakable phrases early for low-latency TTS (not only full sentences). */
export function extractSpeakablePhrases(text: string): {
  phrases: string[];
  remainder: string;
} {
  const phrases: string[] = [];
  let buffer = text;

  while (buffer.length > 0) {
    const sentenceMatch = /^(.+?[.!?…]+)\s*/.exec(buffer);
    if (sentenceMatch?.[1]) {
      const phrase = sentenceMatch[1].trim();
      if (phrase) {
        phrases.push(phrase);
      }
      buffer = buffer.slice(sentenceMatch[0].length);
      continue;
    }

    const commaMatch = /^(.{12,}?[,;:—–-])\s+/.exec(buffer);
    if (commaMatch?.[1] && countWords(commaMatch[1]) >= MIN_PHRASE_WORDS) {
      const phrase = commaMatch[1].trim();
      if (phrase) {
        phrases.push(phrase);
      }
      buffer = buffer.slice(commaMatch[0].length);
      continue;
    }

    if (countWords(buffer) >= FORCE_FLUSH_WORDS) {
      const words = buffer.trim().split(/\s+/);
      const chunk = words.slice(0, FORCE_FLUSH_WORDS).join(" ");
      phrases.push(chunk);
      buffer = words.slice(FORCE_FLUSH_WORDS).join(" ");
      continue;
    }

    break;
  }

  return { phrases, remainder: buffer };
}
