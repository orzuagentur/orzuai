export function extractCompleteSentences(text: string): {
  sentences: string[];
  remainder: string;
} {
  const sentences: string[] = [];
  let lastIndex = 0;
  const pattern = /([^.!?…]+[.!?…]+)\s*/g;
  let match: RegExpExecArray | null = pattern.exec(text);

  while (match) {
    const sentence = match[1]?.trim();
    if (sentence) {
      sentences.push(sentence);
    }
    lastIndex = pattern.lastIndex;
    match = pattern.exec(text);
  }

  return {
    sentences,
    remainder: text.slice(lastIndex),
  };
}
