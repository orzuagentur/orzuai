"use client";

import { useEffect, useRef, useState } from "react";

import type { LandingDemoMessage } from "@/features/landing/demo/types";

const REVEAL_MS = 2400;
const HISTORY_CAP = 18;

/**
 * Accumulates demo messages slowly (messenger-like), looping endlessly.
 */
export function useEndlessDemoChat(
  messages: LandingDemoMessage[],
  enabled: boolean,
  reducedMotion: boolean | null,
) {
  const [history, setHistory] = useState<LandingDemoMessage[]>([]);
  const indexRef = useRef(0);
  const messagesKey = messages.map((m) => m.text).join("|");

  useEffect(() => {
    indexRef.current = 0;
    if (messages.length === 0) {
      setHistory([]);
      return;
    }
    if (reducedMotion) {
      setHistory(messages.slice(0, Math.min(6, messages.length)));
      return;
    }
    setHistory(messages.slice(0, 1));
    indexRef.current = 1;
  }, [messagesKey, messages, reducedMotion]);

  useEffect(() => {
    if (!enabled || reducedMotion || messages.length === 0) return;

    const timer = window.setInterval(() => {
      const next = messages[indexRef.current % messages.length];
      indexRef.current += 1;
      if (!next) return;
      setHistory((prev) => {
        const merged = [...prev, next];
        return merged.length > HISTORY_CAP
          ? merged.slice(merged.length - HISTORY_CAP)
          : merged;
      });
    }, REVEAL_MS);

    return () => window.clearInterval(timer);
  }, [enabled, messages, reducedMotion]);

  return { visibleMessages: history };
}

export function useDemoSpeechPlayback(
  turns: { speaker: "customer" | "ai"; text: string }[],
  locale: string,
) {
  const [playing, setPlaying] = useState(false);
  const [turnIndex, setTurnIndex] = useState(-1);
  const cancelRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function stop() {
    cancelRef.current = true;
    setPlaying(false);
    setTurnIndex(-1);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  async function play() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      cancelRef.current = false;
      setPlaying(true);
      for (let i = 0; i < turns.length; i += 1) {
        if (cancelRef.current) break;
        setTurnIndex(i);
        await wait(3200);
      }
      if (!cancelRef.current) {
        setPlaying(false);
        setTurnIndex(turns.length - 1);
      }
      return;
    }

    cancelRef.current = false;
    setPlaying(true);
    window.speechSynthesis.cancel();

    await ensureVoicesReady();
    const voices = window.speechSynthesis.getVoices();
    const lang = locale === "ru" ? "ru" : locale === "uz" ? "uz" : "en";

    for (let i = 0; i < turns.length; i += 1) {
      if (cancelRef.current) break;
      const turn = turns[i];
      if (!turn) continue;
      setTurnIndex(i);

      // Short thinking pause between speakers feels more like a live call.
      if (i > 0) await wait(turn.speaker === "ai" ? 520 : 380);

      await speakUtterance(turn.text, {
        lang,
        speaker: turn.speaker,
        voices,
      });
    }

    if (!cancelRef.current) {
      setPlaying(false);
      setTurnIndex(Math.max(0, turns.length - 1));
    }
  }

  function toggle() {
    if (playing) {
      stop();
      return;
    }
    void play();
  }

  return { playing, turnIndex, toggle, stop };
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function ensureVoicesReady() {
  return new Promise<void>((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve();
      return;
    }
    const onVoices = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
      resolve();
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoices);
    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
      resolve();
    }, 400);
  });
}

function speakUtterance(
  text: string,
  options: {
    lang: string;
    speaker: "customer" | "ai";
    voices: SpeechSynthesisVoice[];
  },
) {
  return new Promise<void>((resolve) => {
    // Soften pacing with natural commas / pauses without changing copy.
    const spoken = text
      .replace(/([.!?])\s+/g, "$1 … ")
      .replace(/,\s+/g, ", ");

    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang =
      options.lang === "ru" ? "ru-RU" : options.lang === "uz" ? "uz-UZ" : "en-US";
    utterance.rate = options.speaker === "ai" ? 0.94 : 0.9;
    utterance.pitch = options.speaker === "ai" ? 1.08 : 0.86;
    utterance.volume = options.speaker === "ai" ? 1 : 0.92;

    const preferred = options.voices.filter((voice) =>
      voice.lang.toLowerCase().startsWith(options.lang),
    );
    const englishFallback = options.voices.filter((voice) =>
      voice.lang.toLowerCase().startsWith("en"),
    );
    const pool = preferred.length > 0 ? preferred : englishFallback;

    if (pool.length > 0) {
      // Prefer contrasting voices for AI vs customer when available.
      utterance.voice =
        options.speaker === "ai"
          ? pool.find((v) => /female|samantha|aria|zira|google uk english female/i.test(v.name)) ??
            pool[pool.length - 1] ??
            pool[0]!
          : pool.find((v) => /male|david|mark|google uk english male/i.test(v.name)) ??
            pool[0]!;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
