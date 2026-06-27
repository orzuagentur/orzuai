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

import { VOICE_MESSAGES } from "@/features/voice/constants";

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
  isOnline: boolean;
  goOnline: () => Promise<void>;
  goOffline: () => void;
  placeCall: (phoneNumber: string) => Promise<void>;
  hangUp: () => void;
  toggleMute: () => void;
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
      isOnline: false,
      goOnline: async () => {},
      goOffline: () => {},
      placeCall: async () => {},
      hangUp: () => {},
      toggleMute: () => {},
      acceptIncoming: () => {},
      rejectIncoming: () => {},
    };
  }

  return context;
}

function useVoiceSoftphoneState(input: {
  enabled: boolean;
  businessId: string | null;
}): VoiceSoftphoneContextValue {
  const [status, setStatus] = useState<SoftphoneStatus>("offline");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const deviceRef = useRef<DeviceInstance | null>(null);
  const activeCallRef = useRef<CallInstance | null>(null);
  const incomingCallRef = useRef<CallInstance | null>(null);
  const isRegisteredRef = useRef(false);

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

    if (deviceRef.current) {
      deviceRef.current.removeAllListeners();
      void deviceRef.current.unregister();
      deviceRef.current.destroy();
      deviceRef.current = null;
    }

    isRegisteredRef.current = false;

    setIsMuted(false);
    setError(null);
    setStatus("offline");
  }, [cleanupCall]);

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
      call.on("accept", () => {
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

        setIsMuted(false);
        setStatus(isRegisteredRef.current ? "ready" : "offline");
      });

      call.on("cancel", () => {
        if (incomingCallRef.current === call) {
          incomingCallRef.current = null;
        }

        setStatus(isRegisteredRef.current ? "ready" : "offline");
      });

      call.on("reject", () => {
        if (incomingCallRef.current === call) {
          incomingCallRef.current = null;
        }

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
    [],
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
      const response = await fetch("/api/voice/token");

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
        setStatus("ready");
        setError(null);
      });

      device.on("unregistered", () => {
        isRegisteredRef.current = false;
        setStatus("offline");
      });

      device.on("error", (deviceError) => {
        setError(deviceError.message || VOICE_MESSAGES.softphoneError);
        setStatus("error");
      });

      device.on("incoming", (call) => {
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
      setStatus("error");
      goOffline();
    }
  }, [attachCallListeners, goOffline, input.businessId, input.enabled]);

  const placeCall = useCallback(
    async (phoneNumber: string) => {
      if (!input.businessId) {
        return;
      }

      const normalized = phoneNumber.trim();

      if (!normalized) {
        return;
      }

      if (!deviceRef.current || !isRegisteredRef.current) {
        await goOnline();
      }

      const device = deviceRef.current;

      if (!device || !isRegisteredRef.current) {
        setError(VOICE_MESSAGES.softphoneRegisterFailed);
        setStatus("error");
        return;
      }

      setStatus("connecting");
      setError(null);

      try {
        const call = await device.connect({
          params: {
            To: normalized,
            businessId: input.businessId,
          },
        });

        attachCallListeners(call, "outbound");
      } catch (callError) {
        setError(
          callError instanceof Error
            ? callError.message
            : VOICE_MESSAGES.callOutboundFailed,
        );
        setStatus("ready");
      }
    },
    [attachCallListeners, goOnline, input.businessId],
  );

  const hangUp = useCallback(() => {
    cleanupCall(activeCallRef.current);
    cleanupCall(incomingCallRef.current);
    activeCallRef.current = null;
    incomingCallRef.current = null;
    setIsMuted(false);
    setStatus(isRegisteredRef.current ? "ready" : "offline");
  }, [cleanupCall]);

  const toggleMute = useCallback(() => {
    const call = activeCallRef.current ?? incomingCallRef.current;

    if (!call) {
      return;
    }

    const nextMuted = !call.isMuted();
    call.mute(nextMuted);
    setIsMuted(nextMuted);
  }, []);

  const acceptIncoming = useCallback(() => {
    const call = incomingCallRef.current;

    if (!call) {
      return;
    }

    call.accept();
    activeCallRef.current = call;
    incomingCallRef.current = null;
    setStatus("on-call");
  }, []);

  const rejectIncoming = useCallback(() => {
    const call = incomingCallRef.current;

    if (!call) {
      return;
    }

    call.reject();
    incomingCallRef.current = null;
    setStatus(isRegisteredRef.current ? "ready" : "offline");
  }, []);

  return {
    enabled: input.enabled,
    status,
    error,
    isMuted,
    isOnline: status !== "offline" && status !== "error",
    goOnline,
    goOffline,
    placeCall,
    hangUp,
    toggleMute,
    acceptIncoming,
    rejectIncoming,
  };
}
