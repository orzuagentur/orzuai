"use client";

import { useEffect, useRef, useState } from "react";

import type { VoiceCallDetail } from "@/types/voice-inbox.types";
import {
  isConnectedVoiceCallStatus,
  isRingingVoiceCallStatus,
} from "@/utils/voice-call-display";
import { phonesMatch } from "@/utils/voice-contact-calls";

type SoftphoneSnapshot = {
  status: string;
  activePhoneNumber: string | null;
  callElapsedSeconds: number | null;
};

export type LiveCallTimerState = {
  isRinging: boolean;
  isConnected: boolean;
  displaySeconds: number | null;
};

export function useLiveCallTimer(
  call: VoiceCallDetail,
  softphone: SoftphoneSnapshot,
): LiveCallTimerState {
  const isSoftphoneMatch = phonesMatch(
    softphone.activePhoneNumber ?? "",
    call.phoneNumber,
  );
  const isRinging =
    isRingingVoiceCallStatus(call.status)
    || (isSoftphoneMatch && softphone.status === "connecting")
    || (isSoftphoneMatch && softphone.status === "incoming");
  const isConnected =
    isConnectedVoiceCallStatus(call.status)
    || (isSoftphoneMatch && softphone.status === "on-call");

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
    if (!isConnected || isSoftphoneMatch) {
      return;
    }

    const startedAt = answeredAtRef.current ?? Date.now();

    const tick = () => {
      setServerElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [isConnected, isSoftphoneMatch, call.id]);

  const displaySeconds =
    isSoftphoneMatch && softphone.status === "on-call"
      ? softphone.callElapsedSeconds
      : isConnected
        ? (call.durationSeconds ?? serverElapsed)
        : null;

  return {
    isRinging,
    isConnected,
    displaySeconds,
  };
}
