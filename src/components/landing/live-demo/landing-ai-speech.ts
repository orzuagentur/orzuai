"use client";

/**
 * Play AI speech via ElevenLabs (landing TTS route), falling back to browser TTS.
 */
export async function playLandingAiSpeech(
  text: string,
  locale: string,
  signal?: AbortSignal,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  try {
    const response = await fetch("/api/landing/elevenlabs/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed, locale }),
      signal,
    });

    if (response.ok) {
      const blob = await response.blob();
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob);
        try {
          await playAudioUrl(url, signal);
        } finally {
          URL.revokeObjectURL(url);
        }
        return;
      }
    }
  } catch {
    /* fall through to browser TTS */
  }

  await speakBrowser(trimmed, locale, signal);
}

function playAudioUrl(url: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    };

    if (signal?.aborted) {
      cleanup();
      resolve();
      return;
    }

    const onAbort = () => {
      cleanup();
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    audio.onended = () => {
      signal?.removeEventListener("abort", onAbort);
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      cleanup();
      resolve();
    };

    void audio.play().catch(() => {
      signal?.removeEventListener("abort", onAbort);
      cleanup();
      resolve();
    });
  });
}

function speakBrowser(text: string, locale: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      globalThis.setTimeout(() => resolve(), 700);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang =
      locale === "ru" ? "ru-RU" : locale === "uz" ? "uz-UZ" : "en-US";
    utterance.rate = 0.96;
    utterance.pitch = 1.05;

    const finish = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    const onAbort = () => {
      window.speechSynthesis.cancel();
      finish();
    };

    if (signal?.aborted) {
      finish();
      return;
    }

    signal?.addEventListener("abort", onAbort, { once: true });
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  });
}
