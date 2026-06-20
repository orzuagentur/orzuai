"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { AiAssistantEditPanel } from "@/components/ai-assistant/AiAssistantEditPanel";
import { AiAssistantHubPanel } from "@/components/ai-assistant/AiAssistantHubPanel";
import type { AiAssistantPageData } from "@/types/channel-workspace.types";
import { buildAiAssistantHref } from "@/utils/ai-assistant-url";

type AiAssistantSectionProps = {
  data: AiAssistantPageData;
};

export function AiAssistantSection({ data }: AiAssistantSectionProps) {
  const router = useRouter();

  const handleCloseAssistantEdit = useCallback(() => {
    router.push(
      buildAiAssistantHref({
        section: "assistant",
        assistantEdit: false,
      }),
    );
  }, [router]);

  return (
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      {data.isEditingAssistant && data.assistantProfile ? (
        <AiAssistantEditPanel
          profile={data.assistantProfile}
          onBack={handleCloseAssistantEdit}
        />
      ) : (
        <AiAssistantHubPanel
          channels={data.channels}
          enabledChannelCount={data.enabledChannelCount}
        />
      )}
    </div>
  );
}
