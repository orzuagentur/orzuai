"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { playLandingAiSpeech } from "@/components/landing/live-demo/landing-ai-speech";

export type LiveCallTurn = {
  id: string;
  speaker: "customer" | "ai";
  text: string;
};

export const LANDING_FAKE_CALL_NUMBER = "+49 000 ××××××";
export const LANDING_FAKE_CALL_NUMBER_RAW = "+49000XXXXXX";
export const LIVE_CALL_MAX_SECONDS = 60;

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function greetingForLocale(locale: string): string {
  if (locale === "ru") {
    return "Здравствуйте! Меня зовут OrzuX AI. Чем могу помочь — запись, цены или подключение каналов?";
  }
  if (locale === "uz") {
    return "Assalomu alaykum! Men OrzuX AI agentiman. Bron, narx yoki kanallar bo‘yicha yordam beraymi?";
  }
  return "Hello! This is OrzuX AI. How can I help today — booking, pricing, or connecting your channels?";
}

function buildAiReply(userText: string, locale: string): string {
  const text = userText.toLowerCase();

  if (locale === "ru") {
    if (/привет|здравств|добрый/.test(text)) {
      return "Рада вас слышать. Могу помочь с записью, тарифами или каналами — с чего начнём?";
    }
    if (/запис|брон|встреч|консульт|время|слот/.test(text)) {
      return "Могу забронировать слот. Завтра 15:30 или среда 10:30 — что удобнее?";
    }
    if (/цен|стоим|тариф|прайс|сколько/.test(text)) {
      return "Планы стартуют с пробного периода. Каналы и AI работают в одном workspace.";
    }
    if (/whatsapp|телеграм|канал|инстаграм/.test(text)) {
      return "Да — WhatsApp, Telegram, сайт, email и Calls AI в одном inbox.";
    }
    if (/спасиб|пока|до свид/.test(text)) {
      return "Пожалуйста! Если нужно, отправлю SMS-подтверждение после звонка.";
    }
    return "Поняла. Могу помочь с записью, тарифами или подключением каналов — что важнее сейчас?";
  }

  if (locale === "uz") {
    if (/salom|assalom/.test(text)) {
      return "Xush kelibsiz! Bron, narx yoki kanallar — qaysidan boshlaylik?";
    }
    if (/bron|yozil|uchrashuv|vaqt|slot/.test(text)) {
      return "Slot bron qilaman. Ertaga 15:30 yoki chorshanba 10:30 — qaysi biri qulay?";
    }
    if (/narx|tarif|qancha|price/.test(text)) {
      return "Tariflar sinov davridan boshlanadi. Kanallar va AI bitta workspaceda.";
    }
    if (/whatsapp|telegram|kanal|instagram/.test(text)) {
      return "Ha — WhatsApp, Telegram, sayt, email va Calls AI bitta inboxda.";
    }
    if (/rahmat|xayr/.test(text)) {
      return "Marhamat! Kerak bo‘lsa, qo‘ng‘iroqdan keyin SMS tasdiq yuboraman.";
    }
    return "Tushundim. Bron, tarif yoki kanallar — hozir qaysi biri muhimroq?";
  }

  if (/hi|hello|hey|good (morning|afternoon|evening)/.test(text)) {
    return "Nice to hear from you. I can help with booking, pricing, or channels — where should we start?";
  }
  if (/book|appoint|slot|schedule|consult|meeting|tomorrow|time/.test(text)) {
    return "I can reserve a slot. Tomorrow at 15:30 or Wednesday at 10:30 — which works better?";
  }
  if (/price|cost|plan|pricing|how much|trial/.test(text)) {
    return "Plans start with a trial period. Channels and AI run together in one workspace.";
  }
  if (/whatsapp|telegram|channel|instagram|inbox|email/.test(text)) {
    return "Yes — WhatsApp, Telegram, website chat, email, and Calls AI share one inbox.";
  }
  if (/thank|bye|goodbye/.test(text)) {
    return "You're welcome! I can also queue an SMS confirmation after this call.";
  }
  return "Got it. I can help with booking, pricing, or connecting channels — what matters most right now?";
}

export function useLiveDemoRealtimeCall(locale: string) {
  const [active, setActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(LIVE_CALL_MAX_SECONDS);
  const [turns, setTurns] = useState<LiveCallTurn[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activeRef = useRef(false);
  const speakingRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const processingRef = useRef(false);
  const turnIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const startListeningRef = useRef<() => void>(() => undefined);

  const stopRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.abort();
    } catch {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    }
    setListening(false);
  }, []);

  const endCall = useCallback(() => {
    activeRef.current = false;
    speakingRef.current = false;
    processingRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    setActive(false);
    setListening(false);
    setSpeaking(false);
    setSecondsLeft(LIVE_CALL_MAX_SECONDS);
    stopRecognition();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [stopRecognition]);

  const speakAi = useCallback(
    async (text: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      speakingRef.current = true;
      setSpeaking(true);
      setListening(false);
      stopRecognition();
      await playLandingAiSpeech(text, locale, controller.signal);
      if (!activeRef.current || controller.signal.aborted) {
        speakingRef.current = false;
        setSpeaking(false);
        return;
      }
      speakingRef.current = false;
      setSpeaking(false);
    },
    [locale, stopRecognition],
  );

  const startListening = useCallback(() => {
    if (!activeRef.current || speakingRef.current) return;

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setError("unsupported");
      return;
    }

    stopRecognition();

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang =
      locale === "ru" ? "ru-RU" : locale === "uz" ? "uz-UZ" : "en-US";

    recognition.onresult = (event) => {
      if (!activeRef.current || speakingRef.current || processingRef.current) return;

      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result?.isFinal) {
          transcript += result[0]?.transcript ?? "";
        }
      }
      transcript = transcript.trim();
      if (!transcript) return;

      processingRef.current = true;
      turnIdRef.current += 1;
      const customerId = `live-c-${turnIdRef.current}`;
      setTurns((prev) => [
        ...prev,
        { id: customerId, speaker: "customer", text: transcript },
      ]);

      void (async () => {
        const reply = buildAiReply(transcript, locale);
        turnIdRef.current += 1;
        const aiId = `live-a-${turnIdRef.current}`;
        setTurns((prev) => [
          ...prev,
          { id: aiId, speaker: "ai", text: reply },
        ]);

        await speakAi(reply);

        processingRef.current = false;
        if (activeRef.current) {
          startListeningRef.current();
        }
      })();
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("mic");
        endCall();
        return;
      }
      if (event.error === "aborted" || event.error === "no-speech") return;
    };

    recognition.onend = () => {
      setListening(false);
      if (
        activeRef.current &&
        !speakingRef.current &&
        !processingRef.current
      ) {
        window.setTimeout(() => {
          if (activeRef.current && !speakingRef.current) {
            startListeningRef.current();
          }
        }, 220);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setError(null);
    } catch {
      setError("unsupported");
    }
  }, [endCall, locale, speakAi, stopRecognition]);

  startListeningRef.current = startListening;

  const startCall = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (!getSpeechRecognitionCtor()) {
      setError("unsupported");
      setTurns([]);
      return;
    }

    turnIdRef.current = 0;
    processingRef.current = false;
    speakingRef.current = false;
    activeRef.current = true;
    setTurns([]);
    setError(null);
    setSecondsLeft(LIVE_CALL_MAX_SECONDS);
    setActive(true);

    void (async () => {
      const greeting = greetingForLocale(locale);
      turnIdRef.current += 1;
      setTurns([
        {
          id: `live-a-${turnIdRef.current}`,
          speaker: "ai",
          text: greeting,
        },
      ]);
      await speakAi(greeting);
      if (activeRef.current) {
        startListeningRef.current();
      }
    })();
  }, [locale, speakAi]);

  useEffect(() => {
    if (!active) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          endCall();
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [active, endCall]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      abortRef.current?.abort();
      stopRecognition();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopRecognition]);

  return {
    active,
    listening,
    speaking,
    secondsLeft,
    turns,
    error,
    startCall,
    endCall,
    supported: typeof window === "undefined" ? true : Boolean(getSpeechRecognitionCtor()),
  };
}
