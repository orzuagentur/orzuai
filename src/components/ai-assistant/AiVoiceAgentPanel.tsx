"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2Icon,
  PauseIcon,
  PhoneCallIcon,
  PlayIcon,
  SearchIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AgentPowerToggle } from "@/components/ai-assistant/AgentPowerToggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveVoiceAgentSettingsAction } from "@/features/ai-assistant/actions/save-voice-agent-settings";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { selectTwilioPhoneNumberAction } from "@/features/twilio/actions/select-phone";
import { toggleVoiceAiAction } from "@/features/voice/actions/toggle-voice-ai";
import { VOICE_MESSAGES } from "@/features/voice/constants";
import { cn } from "@/lib/utils";
import type { AiAssistantProfileData } from "@/types/ai-assistant-profile.types";
import type { ElevenLabsVoiceSummary } from "@/types/elevenlabs.types";
import type { TwilioPhoneNumberOption } from "@/types/twilio-integration.types";
import type {
  VoiceAgentSettings,
  VoiceConnectionData,
} from "@/types/voice-agent.types";

type AiVoiceAgentPanelProps = {
  profile: AiAssistantProfileData;
  elevenLabsConfigured: boolean;
  voiceConnection: VoiceConnectionData | null;
  voiceSettings: VoiceAgentSettings | null;
  availablePhoneNumbers: TwilioPhoneNumberOption[];
};

function formatVoiceMeta(voice: ElevenLabsVoiceSummary): string {
  return [voice.gender, voice.accent, voice.age, voice.category]
    .filter(Boolean)
    .join(" · ");
}

export function AiVoiceAgentPanel({
  profile,
  elevenLabsConfigured,
  voiceConnection,
  voiceSettings,
  availablePhoneNumbers,
}: AiVoiceAgentPanelProps) {
  const router = useRouter();
  const [callAiEnabled, setCallAiEnabled] = useState(
    voiceSettings?.aiEnabled ?? false,
  );
  const [selectedPhoneSid, setSelectedPhoneSid] = useState<string | null>(
    voiceConnection?.phoneSid ?? availablePhoneNumbers[0]?.sid ?? null,
  );
  const [selectedVoiceId, setSelectedVoiceId] = useState(
    profile.elevenlabsVoiceId ?? "",
  );
  const [selectedVoiceName, setSelectedVoiceName] = useState(
    profile.elevenlabsVoiceName ?? "",
  );
  const [voices, setVoices] = useState<ElevenLabsVoiceSummary[]>([]);
  const [search, setSearch] = useState("");
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!elevenLabsConfigured) {
      return;
    }

    let cancelled = false;

    async function loadVoices() {
      setIsLoadingVoices(true);
      setVoicesError(null);

      try {
        const response = await fetch("/api/ai-assistant/elevenlabs/voices");
        const payload = (await response.json()) as {
          success: boolean;
          voices?: ElevenLabsVoiceSummary[];
          message?: string;
        };

        if (!cancelled) {
          if (!response.ok || !payload.success) {
            setVoicesError(
              payload.message ?? AI_ASSISTANT_MESSAGES.voiceAgentLoadFailed,
            );
            return;
          }
          setVoices(payload.voices ?? []);
        }
      } catch {
        if (!cancelled) {
          setVoicesError(AI_ASSISTANT_MESSAGES.voiceAgentLoadFailed);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingVoices(false);
        }
      }
    }

    void loadVoices();
    return () => {
      cancelled = true;
    };
  }, [elevenLabsConfigured]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const filteredVoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return voices;
    return voices.filter((voice) => {
      const haystack = [
        voice.name,
        voice.gender,
        voice.accent,
        voice.age,
        voice.category,
        voice.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [search, voices]);

  async function togglePreview(voice: ElevenLabsVoiceSummary) {
    if (!voice.previewUrl) {
      toast.error(AI_ASSISTANT_MESSAGES.voiceAgentPreviewUnavailable);
      return;
    }

    if (playingVoiceId === voice.voiceId) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
      return;
    }

    audioRef.current?.pause();
    const audio = new Audio(voice.previewUrl);
    audioRef.current = audio;
    setPlayingVoiceId(voice.voiceId);
    audio.onended = () => setPlayingVoiceId(null);
    audio.onerror = () => {
      setPlayingVoiceId(null);
      toast.error(AI_ASSISTANT_MESSAGES.voiceAgentPreviewFailed);
    };
    await audio.play().catch(() => {
      setPlayingVoiceId(null);
      toast.error(AI_ASSISTANT_MESSAGES.voiceAgentPreviewFailed);
    });
  }

  async function handleToggleCallAi(next: boolean) {
    if (!voiceConnection) {
      toast.error(VOICE_MESSAGES.aiMissing);
      return;
    }
    setIsToggling(true);
    try {
      const result = await toggleVoiceAiAction(next);
      if (!result.success) {
        toast.error(result.message ?? VOICE_MESSAGES.aiSaveFailed);
        return;
      }
      setCallAiEnabled(next);
      toast.success(VOICE_MESSAGES.aiSaved);
      router.refresh();
    } finally {
      setIsToggling(false);
    }
  }

  async function handleSelectPhone(phoneSid: string) {
    setSelectedPhoneSid(phoneSid);
    setIsSaving(true);
    try {
      const result = await selectTwilioPhoneNumberAction({ phoneSid });
      if (!result.success) {
        toast.error(result.message ?? "Could not select phone number.");
        return;
      }
      toast.success("Phone number selected for AI calls.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveVoice() {
    if (callAiEnabled && !selectedVoiceId) {
      toast.error(AI_ASSISTANT_MESSAGES.voiceAgentSelectVoiceError);
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveVoiceAgentSettingsAction({
        // Chat voice replies are disabled — voice is call-only.
        voiceReplyEnabled: false,
        elevenlabsVoiceId: selectedVoiceId || null,
        elevenlabsVoiceName: selectedVoiceName || null,
        voiceReplyMode: "mirror",
      });

      if (!result.success) {
        toast.error(
          result.message ?? AI_ASSISTANT_MESSAGES.voiceAgentSaveFailed,
        );
        return;
      }

      toast.success(AI_ASSISTANT_MESSAGES.voiceAgentSaved);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <PhoneCallIcon className="size-4" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base">
                {AI_ASSISTANT_MESSAGES.voiceCallAgentTitle}
              </CardTitle>
              <CardDescription>
                {AI_ASSISTANT_MESSAGES.voiceCallAgentHint}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {callAiEnabled ? "On" : "Off"}
            </span>
            <AgentPowerToggle
              enabled={callAiEnabled}
              disabled={!voiceConnection || isToggling || isSaving}
              onChange={(value) => {
                void handleToggleCallAi(value);
              }}
            />
          </div>
        </CardHeader>
        {!voiceConnection ? (
          <CardContent className="pt-0 text-sm text-amber-700">
            Connect Twilio Voice in Integrations first.
          </CardContent>
        ) : null}
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {AI_ASSISTANT_MESSAGES.voiceCallNumbersTitle}
          </CardTitle>
          <CardDescription>
            {AI_ASSISTANT_MESSAGES.voiceCallNumbersHint}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {availablePhoneNumbers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No Twilio numbers yet. Buy or import a number in Voice integration.
            </p>
          ) : (
            availablePhoneNumbers.map((phone) => {
              const selected = phone.sid === selectedPhoneSid;
              return (
                <button
                  key={phone.sid}
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleSelectPhone(phone.sid)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    selected
                      ? "border-violet-300 bg-violet-50"
                      : "hover:bg-muted/40",
                  )}
                >
                  <span className="font-medium tabular-nums">
                    {phone.phoneNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selected ? "AI answers" : "Select"}
                  </span>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {AI_ASSISTANT_MESSAGES.voiceCallVoiceTitle}
          </CardTitle>
          <CardDescription>
            {AI_ASSISTANT_MESSAGES.voiceCallVoiceHint}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!elevenLabsConfigured ? (
            <p className="text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.voiceAgentNotConfigured}
            </p>
          ) : (
            <>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search voices…"
                  className="pl-8"
                />
              </div>

              {isLoadingVoices ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2Icon className="size-4 animate-spin" />
                  Loading voices…
                </div>
              ) : null}

              {voicesError ? (
                <p className="text-sm text-destructive">{voicesError}</p>
              ) : null}

              <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border p-1">
                {filteredVoices.map((voice) => {
                  const selected = selectedVoiceId === voice.voiceId;
                  return (
                    <div
                      key={voice.voiceId}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5",
                        selected ? "bg-violet-50" : "hover:bg-muted/40",
                      )}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => {
                          setSelectedVoiceId(voice.voiceId);
                          setSelectedVoiceName(voice.name);
                        }}
                      >
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase",
                            selected
                              ? "bg-violet-600 text-white"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {voice.name.slice(0, 1)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {voice.name}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {formatVoiceMeta(voice) || "ElevenLabs"}
                          </span>
                        </span>
                      </button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0"
                        onClick={() => void togglePreview(voice)}
                      >
                        {playingVoiceId === voice.voiceId ? (
                          <PauseIcon className="size-3.5" />
                        ) : (
                          <PlayIcon className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving || !selectedVoiceId}
                  onClick={() => void handleSaveVoice()}
                >
                  {isSaving ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : null}
                  Save voice
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Chat replies stay text-only. Voice is used only for phone calls.
      </p>
      <Label className="sr-only">Voice call agent settings</Label>
    </div>
  );
}
