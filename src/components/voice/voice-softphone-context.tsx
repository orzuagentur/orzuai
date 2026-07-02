"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { VOICE_MESSAGES } from "@/features/voice/constants";
import {
  playCallDisconnectedTone,
  startOutboundRingback,
  stopOutboundRingback,
} from "@/lib/voice/call-sounds";
import { requestEndVoiceCall, requestReleaseOperatorVoiceLine } from "@/lib/voice/request-end-call";

export type SoftphoneStatus =
  | "offline"
  | "registering"
  | "ready"
  | "connecting"
  | "on-call"
  | "incoming"
  | "error";

type DeviceInstance = import("@twilio/voice-sdk").Device;
type CallInstance = import("@twilio/voice-sdk").Call;

type VoiceSoftphoneContextValue = {
  enabled: boolean;
  status: SoftphoneStatus;
  error: string | null;
  isMuted: boolean;
  isSpeakerMuted: boolean;
  isOnline: boolean;
  activePhoneNumber: string | null;
  activeCallSid: string | null;
  callElapsedSeconds: number | null;
  goOnline: () => Promise<void>;
  goOffline: () => void;
  placeCall: (phoneNumber: string) => Promise<void>;
  sendDigits: (digits: string) => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  acceptIncoming: () => void;
  rejectIncoming: () => void;
};

const VoiceSoftphoneContext = createContext<VoiceSoftphoneContextValue | null>(
  null,
);

type VoiceSoftphoneProviderProps = {
  enabled: boolean;
  businessId: string | null;
  children: ReactNode;
};

export function VoiceSoftphoneProvider({
  enabled,
  businessId,
  children,
}: VoiceSoftphoneProviderProps) {
  const value = useVoiceSoftphoneState({ enabled, businessId });

  return (
    <VoiceSoftphoneContext.Provider value={value}>
      {children}
    </VoiceSoftphoneContext.Provider>
  );
}

export function useVoiceSoftphone(): VoiceSoftphoneContextValue {
  const context = useContext(VoiceSoftphoneContext);

  if (!context) {
    return {
      enabled: false,
      status: "offline",
      error: null,
      isMuted: false,
      isSpeakerMuted: false,
      isOnline: false,
      activePhoneNumber: null,
      activeCallSid: null,
      callElapsedSeconds: null,
      goOnline: async () => {},
      goOffline: () => {},
      placeCall: async () => {},
      sendDigits: () => {},
      hangUp: () => {},
      toggleMute: () => {},
      toggleSpeaker: () => {},
      acceptIncoming: () => {},
      rejectIncoming: () => {},
    };
  }

  return context;
}

function playIncomingCallSound(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.8,
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.8);
    oscillator.addEventListener("ended", () => {
      void audioContext.close();
    });
  } catch {
    // Browsers may block synthetic audio until the user interacts with the page.
  }
}

function useVoiceSoftphoneState(input: {
  enabled: boolean;
  businessId: string | null;
}): VoiceSoftphoneContextValue {
  const [status, setStatus] = useState<SoftphoneStatus>("offline");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [activePhoneNumber, setActivePhoneNumber] = useState<string | null>(null);
  const [activeCallSid, setActiveCallSid] = useState<string | null>(null);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callElapsedSeconds, setCallElapsedSeconds] = useState<number | null>(
    null,
  );
  const deviceRef = useRef<DeviceInstance | null>(null);
  const activeCallRef = useRef<CallInstance | null>(null);
  const incomingCallRef = useRef<CallInstance | null>(null);
  const incomingToastIdRef = useRef<string | number | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const isRegisteredRef = useRef(false);
  const hasDeviceErrorRef = useRef(false);

  const endRequestedSidsRef = useRef(new Set<string>());
  const activePhoneNumberRef = useRef<string | null>(null);

  useEffect(() => {
    activePhoneNumberRef.current = activePhoneNumber;
  }, [activePhoneNumber]);

  const requestServerEnd = useCallback(
    (request: {
      parentCallSid?: string | null;
      phoneNumber?: string | null;
    }) => {
      const sid = request.parentCallSid?.trim();
      const phone = request.phoneNumber?.trim();

      if ((!sid && !phone) || !input.businessId || !input.enabled) {
        return;
      }

      const requestKey = sid ?? `phone:${phone}`;

      if (endRequestedSidsRef.current.has(requestKey)) {
        return;
      }

      endRequestedSidsRef.current.add(requestKey);

      void requestEndVoiceCall({
        parentCallSid: sid,
        phoneNumber: phone,
      }).finally(() => {
        endRequestedSidsRef.current.delete(requestKey);
        void requestReleaseOperatorVoiceLine({ phoneNumber: phone });
      });
    },
    [input.businessId, input.enabled],
  );

  const dismissIncomingToast = useCallback(() => {
    if (incomingToastIdRef.current !== null) {
      toast.dismiss(incomingToastIdRef.current);
      incomingToastIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!callStartedAt) {
      setCallElapsedSeconds(null);
      return;
    }

    const updateElapsed = () => {
      setCallElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000)),
      );
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);

    return () => window.clearInterval(intervalId);
  }, [callStartedAt]);

  const cleanupCall = useCallback((call: CallInstance | null) => {
    if (!call) {
      return;
    }

    call.removeAllListeners();
    try {
      call.disconnect();
    } catch {
      // ignore disconnect errors during cleanup
    }
  }, []);

  const goOffline = useCallback(() => {
    cleanupCall(activeCallRef.current);
    cleanupCall(incomingCallRef.current);
    activeCallRef.current = null;
    incomingCallRef.current = null;
    dismissIncomingToast();

    if (deviceRef.current) {
      const device = deviceRef.current;
      device.removeAllListeners();

      if (isRegisteredRef.current) {
        void device.unregister().catch(() => {
          // Twilio can already be unregistered after token/signaling failures.
        });
      }

      device.destroy();
      deviceRef.current = null;
    }

    isRegisteredRef.current = false;
    hasDeviceErrorRef.current = false;

    setIsMuted(false);
    setIsSpeakerMuted(false);
    setActivePhoneNumber(null);
    setActiveCallSid(null);
    setCallStartedAt(null);
    remoteAudioRef.current = null;
    setError(null);
    setStatus("offline");
  }, [cleanupCall, dismissIncomingToast]);

  useEffect(() => {
    return () => {
      goOffline();
    };
  }, [goOffline]);

  useEffect(() => {
    if (!input.enabled) {
      goOffline();
    }
  }, [goOffline, input.enabled]);

  const attachCallListeners = useCallback(
    (call: CallInstance, mode: "outbound" | "incoming") => {
      const parentCallSid = call.parameters?.CallSid?.trim() ?? null;

      if (parentCallSid) {
        setActiveCallSid(parentCallSid);
      }

      call.on("audio", (remoteAudio: HTMLAudioElement) => {
        remoteAudioRef.current = remoteAudio;
      });

      call.on("accept", () => {
        dismissIncomingToast();
        stopOutboundRingback();
        setCallStartedAt(Date.now());
        setStatus("on-call");
        setError(null);
      });

      call.on("disconnect", () => {
        if (activeCallRef.current === call) {
          activeCallRef.current = null;
        }

        if (incomingCallRef.current === call) {
          incomingCallRef.current = null;
        }

        if (mode === "outbound") {
          requestServerEnd({
            parentCallSid: parentCallSid ?? call.parameters?.CallSid,
            phoneNumber: activePhoneNumberRef.current,
          });
        }

        stopOutboundRingback();
        playCallDisconnectedTone();

        dismissIncomingToast();
        setIsMuted(false);
        setIsSpeakerMuted(false);
        setActivePhoneNumber(null);
        setActiveCallSid(null);
        setCallStartedAt(null);
        remoteAudioRef.current = null;
        setStatus(isRegisteredRef.current ? "ready" : "offline");
      });

      call.on("cancel", () => {
        if (activeCallRef.current === call) {
          activeCallRef.current = null;
        }

        if (incomingCallRef.current === call) {
          incomingCallRef.current = null;
        }

        if (mode === "outbound") {
          requestServerEnd({
            parentCallSid: parentCallSid ?? call.parameters?.CallSid,
            phoneNumber: activePhoneNumberRef.current,
          });
        }

        stopOutboundRingback();
        playCallDisconnectedTone();

        dismissIncomingToast();
        setActivePhoneNumber(null);
        setActiveCallSid(null);
        setCallStartedAt(null);
        setStatus(isRegisteredRef.current ? "ready" : "offline");
      });

      call.on("reject", () => {
        if (activeCallRef.current === call) {
          activeCallRef.current = null;
        }

        if (incomingCallRef.current === call) {
          incomingCallRef.current = null;
        }

        stopOutboundRingback();
        playCallDisconnectedTone();

        dismissIncomingToast();
        setActivePhoneNumber(null);
        setActiveCallSid(null);
        setCallStartedAt(null);
        setStatus(isRegisteredRef.current ? "ready" : "offline");
      });

      call.on("error", (callError) => {
        setError(callError.message || VOICE_MESSAGES.softphoneError);
        setStatus("error");
      });

      if (mode === "outbound") {
        activeCallRef.current = call;
        setStatus("connecting");
      } else {
        incomingCallRef.current = call;
        setStatus("incoming");
      }
    },
    [dismissIncomingToast, requestServerEnd],
  );

  const goOnline = useCallback(async () => {
    if (!input.enabled || !input.businessId) {
      setError(VOICE_MESSAGES.softphoneNotConfigured);
      setStatus("error");
      return;
    }

    if (deviceRef.current && isRegisteredRef.current) {
      setStatus("ready");
      return;
    }

    setStatus("registering");
    setError(null);

    try {
      const response = await fetch("/api/voice/token", { cache: "no-store" });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? VOICE_MESSAGES.softphoneRegisterFailed);
      }

      const payload = (await response.json()) as { token: string };
      const { Device, Call } = await import("@twilio/voice-sdk");
      const device = new Device(payload.token, {
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        closeProtection: true,
      });

      device.on("registered", () => {
        isRegisteredRef.current = true;
        hasDeviceErrorRef.current = false;
        setStatus("ready");
        setError(null);
      });

      device.on("unregistered", () => {
        isRegisteredRef.current = false;
        setStatus(hasDeviceErrorRef.current ? "error" : "offline");
      });

      device.on("error", (deviceError) => {
        hasDeviceErrorRef.current = true;
        setError(deviceError.message || VOICE_MESSAGES.softphoneError);
        setStatus("error");
      });

      device.on("incoming", (call) => {
        const from =
          call.parameters?.From?.trim() ||
          call.customParameters?.get?.("From")?.trim() ||
          null;
        if (from) {
          setActivePhoneNumber(from);
        }
        playIncomingCallSound();
        incomingToastIdRef.current = toast.info(
          from ? `Incoming call from ${from}` : "Incoming phone call",
          {
            duration: 30000,
            action: {
              label: "Answer",
              onClick: () => {
                call.accept();
              },
            },
          },
        );
        attachCallListeners(call, "incoming");
      });

      deviceRef.current = device;
      await device.register();
    } catch (registerError) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : VOICE_MESSAGES.softphoneRegisterFailed,
      );
      hasDeviceErrorRef.current = true;
      if (deviceRef.current) {
        const failedDevice = deviceRef.current;
        failedDevice.removeAllListeners();
        failedDevice.destroy();
        deviceRef.current = null;
      }
      isRegisteredRef.current = false;
      setStatus("error");
    }
  }, [attachCallListeners, input.businessId, input.enabled]);

  const placeCall = useCallback(
    async (phoneNumber: string) => {
      if (!input.businessId) {
        throw new Error(VOICE_MESSAGES.softphoneNotConfigured);
      }

      const normalized = phoneNumber.trim();

      if (!normalized) {
        throw new Error(VOICE_MESSAGES.callOutboundFailed);
      }

      if (!deviceRef.current || !isRegisteredRef.current) {
        await goOnline();
      }

      const device = deviceRef.current;

      if (!device || !isRegisteredRef.current) {
        setError(VOICE_MESSAGES.softphoneRegisterFailed);
        setStatus("error");
        throw new Error(VOICE_MESSAGES.softphoneRegisterFailed);
      }

      setStatus("connecting");
      setError(null);
      setActivePhoneNumber(normalized);
      startOutboundRingback();

      if (activeCallRef.current) {
        cleanupCall(activeCallRef.current);
        activeCallRef.current = null;
        setActiveCallSid(null);
      }

      try {
        const call = await device.connect({
          params: {
            To: normalized,
            businessId: input.businessId,
          },
        });

        attachCallListeners(call, "outbound");
      } catch (callError) {
        stopOutboundRingback();
        setError(
          callError instanceof Error
            ? callError.message
            : VOICE_MESSAGES.callOutboundFailed,
        );
        setStatus("ready");
        throw callError instanceof Error
          ? callError
          : new Error(VOICE_MESSAGES.callOutboundFailed);
      }
    },
    [attachCallListeners, goOnline, input.businessId],
  );

  const hangUp = useCallback(() => {
    const call = activeCallRef.current;
    const parentCallSid = call?.parameters?.CallSid?.trim() ?? activeCallSid;
    const phoneNumber = activePhoneNumber;

    requestServerEnd({
      parentCallSid,
      phoneNumber,
    });

    stopOutboundRingback();
    playCallDisconnectedTone();

    cleanupCall(activeCallRef.current);
    cleanupCall(incomingCallRef.current);
    activeCallRef.current = null;
    incomingCallRef.current = null;
    setIsMuted(false);
    setIsSpeakerMuted(false);
    setActivePhoneNumber(null);
    setActiveCallSid(null);
    setCallStartedAt(null);
    remoteAudioRef.current = null;
    setStatus(isRegisteredRef.current ? "ready" : "offline");
  }, [activeCallSid, activePhoneNumber, cleanupCall, requestServerEnd]);

  const toggleMute = useCallback(() => {
    const call = activeCallRef.current ?? incomingCallRef.current;

    if (!call) {
      return;
    }

    const nextMuted = !call.isMuted();
    call.mute(nextMuted);
    setIsMuted(nextMuted);
  }, []);

  const toggleSpeaker = useCallback(() => {
    const call = activeCallRef.current ?? incomingCallRef.current;

    if (!call) {
      return;
    }

    const nextSpeakerMuted = !isSpeakerMuted;
    const remoteAudio = remoteAudioRef.current;

    if (remoteAudio) {
      remoteAudio.muted = nextSpeakerMuted;
    }

    const remoteStream = call.getRemoteStream();

    if (remoteStream) {
      for (const track of remoteStream.getAudioTracks()) {
        track.enabled = !nextSpeakerMuted;
      }
    }

    setIsSpeakerMuted(nextSpeakerMuted);
  }, [isSpeakerMuted]);

  const sendDigits = useCallback((digits: string) => {
    const call = activeCallRef.current;

    if (!call || !digits.trim()) {
      return;
    }

    try {
      call.sendDigits(digits);
    } catch {
      // ignore DTMF errors when call is not ready
    }
  }, []);

  const acceptIncoming = useCallback(() => {
    const call = incomingCallRef.current;

    if (!call) {
      return;
    }

    call.accept();
    activeCallRef.current = call;
    incomingCallRef.current = null;
    setCallStartedAt(Date.now());
    setStatus("on-call");
  }, []);

  const rejectIncoming = useCallback(() => {
    const call = incomingCallRef.current;

    if (!call) {
      return;
    }

    call.reject();
    incomingCallRef.current = null;
    dismissIncomingToast();
    setCallStartedAt(null);
    setStatus(isRegisteredRef.current ? "ready" : "offline");
  }, [dismissIncomingToast]);

  return {
    enabled: input.enabled,
    status,
    error,
    isMuted,
    isSpeakerMuted,
    isOnline: status !== "offline" && status !== "error",
    activePhoneNumber,
    activeCallSid,
    callElapsedSeconds,
    goOnline,
    goOffline,
    placeCall,
    sendDigits,
    hangUp,
    toggleMute,
    toggleSpeaker,
    acceptIncoming,
    rejectIncoming,
  };
}
