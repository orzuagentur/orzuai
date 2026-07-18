"use client";

import { useEffect, useRef, useState } from "react";

import type { VoiceCallDetail } from "@/types/voice-inbox.types";
import {
  isConnectedVoiceCallStatus,
  isRingingVoiceCallStatus,
} from "@/utils/voice-call-display";

export type LiveCallTimerState = {
  isRinging: boolean;
  isConnected: boolean;
  displaySeconds: number | null;
};

export function useLiveCallTimer(call: VoiceCallDetail): LiveCallTimerState {
  const isRinging = isRingingVoiceCallStatus(call.status);
  const isConnected = isConnectedVoiceCallStatus(call.status);

  const answeredAtRef = useRef<number | null>(null);
  const [serverElapsed, setServerElapsed] = useState<number | null>(null);

  useEffect(() => {
    if (isConnected) {
      if (!answeredAtRef.current) {
        answeredAtRef.current = Date.now();
      }
      return;
    }

    answeredAtRef.current = null;
    setServerElapsed(null);
  }, [isConnected, call.id]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const startedAt = answeredAtRef.current ?? Date.now();

    const tick = () => {
      setServerElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [isConnected, call.id]);

  const displaySeconds = isConnected
    ? (call.durationSeconds ?? serverElapsed)
    : null;

  return {
    isRinging,
    isConnected,
    displaySeconds,
  };
}
