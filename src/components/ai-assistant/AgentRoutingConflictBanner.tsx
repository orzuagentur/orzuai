"use client";

import { AlertTriangleIcon } from "lucide-react";

import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import type { DefaultAgentConflict } from "@/features/ai-assistant/agent-channel-routing";
import { formatDefaultAgentConflictMessage } from "@/features/ai-assistant/agent-channel-routing";

type AgentRoutingConflictBannerProps = {
  conflicts: DefaultAgentConflict[];
};

export function AgentRoutingConflictBanner({
  conflicts,
}: AgentRoutingConflictBannerProps) {
  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <div className="space-y-1">
        <p className="font-medium text-foreground">
          {AI_ASSISTANT_MESSAGES.agentRoutingConflictTitle}
        </p>
        <p className="text-muted-foreground">
          {formatDefaultAgentConflictMessage(conflicts)}
        </p>
        <p className="text-xs text-muted-foreground">
          {AI_ASSISTANT_MESSAGES.agentKeywordsRequiredHint}
        </p>
      </div>
    </div>
  );
}
