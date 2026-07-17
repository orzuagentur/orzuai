"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2Icon,
  PauseIcon,
  PlayIcon,
  SearchIcon,
  Volume2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { AgentPowerToggle } from "@/components/ai-assistant/AgentPowerToggle";
import { AiAssistantPageHeader } from "@/components/ai-assistant/AiAssistantShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { saveVoiceAgentSettingsAction } from "@/features/ai-assistant/actions/save-voice-agent-settings";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { cn } from "@/lib/utils";
import type { AiAssistantProfileData } from "@/types/ai-assistant-profile.types";
import type {
  ElevenLabsVoiceSummary,
  VoiceReplyMode,
} from "@/types/elevenlabs.types";

type AiVoiceAgentPanelProps = {
  profile: AiAssistantProfileData;
  elevenLabsConfigured: boolean;
  showPageHeader?: boolean;
};

const MODE_OPTIONS: Array<{
  value: VoiceReplyMode;
  labelKey: "voiceAgentModeMirrorLabel" | "voiceAgentModeAlwaysLabel";
  descriptionKey: "voiceAgentModeMirrorHint" | "voiceAgentModeAlwaysHint";
}> = [
  {
    value: "mirror",
    labelKey: "voiceAgentModeMirrorLabel",
    descriptionKey: "voiceAgentModeMirrorHint",
  },
  {
    value: "always",
    labelKey: "voiceAgentModeAlwaysLabel",
    descriptionKey: "voiceAgentModeAlwaysHint",
  },
];

function formatVoiceMeta(voice: ElevenLabsVoiceSummary): string {
  return [voice.gender, voice.accent, voice.age, voice.category]
    .filter(Boolean)
    .join(" · ");
}

export function AiVoiceAgentPanel({
  profile,
  elevenLabsConfigured,
  showPageHeader = true,
}: AiVoiceAgentPanelProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(profile.voiceReplyEnabled);
  const [voiceReplyMode, setVoiceReplyMode] = useState<VoiceReplyMode>(
    profile.voiceReplyMode,
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

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.success) {
          setVoicesError(payload.message ?? "Unable to load voices.");
          setVoices([]);
          return;
        }

        setVoices(payload.voices ?? []);
      } catch {
        if (!cancelled) {
          setVoicesError("Unable to load voices.");
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
      audioRef.current?.pause();
    };
  }, [elevenLabsConfigured]);

  const filteredVoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return voices;
    }

    return voices.filter((voice) => {
      const haystack = [
        voice.name,
        voice.description,
        voice.gender,
        voice.accent,
        voice.age,
        voice.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [search, voices]);

  function stopPreview() {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingVoiceId(null);
  }

  function togglePreview(voice: ElevenLabsVoiceSummary) {
    if (!voice.previewUrl) {
      toast.error("This voice has no preview sample.");
      return;
    }

    if (playingVoiceId === voice.voiceId) {
      stopPreview();
      return;
    }

    stopPreview();

    const audio = new Audio(voice.previewUrl);
    audioRef.current = audio;
    setPlayingVoiceId(voice.voiceId);

    void audio.play().catch(() => {
      toast.error("Unable to play voice preview.");
      stopPreview();
    });

    audio.onended = () => {
      setPlayingVoiceId(null);
      audioRef.current = null;
    };
  }

  function selectVoice(voice: ElevenLabsVoiceSummary) {
    setSelectedVoiceId(voice.voiceId);
    setSelectedVoiceName(voice.name);
  }

  async function handleSave() {
    if (enabled && !selectedVoiceId) {
      toast.error(AI_ASSISTANT_MESSAGES.voiceAgentSelectVoiceError);
      return;
    }

    setIsSaving(true);

    try {
      const result = await saveVoiceAgentSettingsAction({
        voiceReplyEnabled: enabled,
        elevenlabsVoiceId: selectedVoiceId || null,
        elevenlabsVoiceName: selectedVoiceName || null,
        voiceReplyMode,
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
    <div className="flex min-h-0 flex-1 flex-col">
      {showPageHeader ? (
        <AiAssistantPageHeader
          title={AI_ASSISTANT_MESSAGES.voiceAgentTitle}
          description={AI_ASSISTANT_MESSAGES.voiceAgentDescription}
          backHref={DASHBOARD_ROUTES.aiAssistant}
          backLabel={AI_ASSISTANT_MESSAGES.voiceAgentBack}
        />
      ) : null}

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-8">
        {!elevenLabsConfigured ? (
          <Card className="border-dashed shadow-none">
            <CardContent className="py-4 text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.voiceAgentNotConfigured}
            </CardContent>
          </Card>
        ) : null}

        <Card className="shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                <Volume2Icon className="size-4" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg">
                  {AI_ASSISTANT_MESSAGES.voiceAgentActivationTitle}
                </CardTitle>
                <CardDescription>
                  {AI_ASSISTANT_MESSAGES.voiceAgentActivationHint}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {enabled ? "Enabled" : "Disabled"}
              </span>
              <AgentPowerToggle
                enabled={enabled}
                disabled={!elevenLabsConfigured || isSaving}
                onChange={setEnabled}
              />
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{AI_ASSISTANT_MESSAGES.voiceAgentModeTitle}</CardTitle>
            <CardDescription>
              {AI_ASSISTANT_MESSAGES.voiceAgentModeHint}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {MODE_OPTIONS.map((option) => {
                const active = voiceReplyMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!elevenLabsConfigured || isSaving}
                    onClick={() => setVoiceReplyMode(option.value)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/30",
                      (!elevenLabsConfigured || isSaving) &&
                        "cursor-not-allowed opacity-60",
                    )}
                  >
                    <p className="font-medium">
                      {AI_ASSISTANT_MESSAGES[option.labelKey]}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {AI_ASSISTANT_MESSAGES[option.descriptionKey]}
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{AI_ASSISTANT_MESSAGES.voiceAgentPickerTitle}</CardTitle>
                <CardDescription className="mt-1">
                  {AI_ASSISTANT_MESSAGES.voiceAgentPickerHint}
                </CardDescription>
              </div>
              {selectedVoiceName ? (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {AI_ASSISTANT_MESSAGES.voiceAgentSelected(selectedVoiceName)}
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={AI_ASSISTANT_MESSAGES.voiceAgentSearchPlaceholder}
                className="pl-9"
                disabled={!elevenLabsConfigured || isSaving}
              />
            </div>

            {isLoadingVoices ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border py-12 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                {AI_ASSISTANT_MESSAGES.voiceAgentLoading}
              </div>
            ) : voicesError ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                {voicesError}
              </div>
            ) : (
              <div className="max-h-[28rem] overflow-y-auto pr-1">
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredVoices.map((voice) => {
                    const selected = selectedVoiceId === voice.voiceId;
                    const playing = playingVoiceId === voice.voiceId;
                    const meta = formatVoiceMeta(voice);

                    return (
                      <div
                        key={voice.voiceId}
                        className={cn(
                          "rounded-xl border p-4 transition-colors",
                          selected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "hover:bg-muted/20",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            disabled={isSaving}
                            onClick={() => selectVoice(voice)}
                          >
                            <p className="font-medium">{voice.name}</p>
                            {meta ? (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {meta}
                              </p>
                            ) : null}
                            {voice.description ? (
                              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                {voice.description}
                              </p>
                            ) : null}
                          </button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            disabled={!voice.previewUrl || isSaving}
                            onClick={() => togglePreview(voice)}
                            aria-label={
                              playing
                                ? `Pause ${voice.name} preview`
                                : `Play ${voice.name} preview`
                            }
                          >
                            {playing ? (
                              <PauseIcon className="size-4" />
                            ) : (
                              <PlayIcon className="size-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!isLoadingVoices &&
            !voicesError &&
            filteredVoices.length === 0 &&
            elevenLabsConfigured ? (
              <p className="text-sm text-muted-foreground">
                {AI_ASSISTANT_MESSAGES.voiceAgentNoResults}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="sticky bottom-4 flex justify-end">
          <Button
            type="button"
            disabled={isSaving || !elevenLabsConfigured}
            onClick={() => void handleSave()}
          >
            {isSaving ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              AI_ASSISTANT_MESSAGES.voiceAgentSave
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
