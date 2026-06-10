"use client";

import { AiAgentIcon } from "@/components/ai-assistant/AiAgentIcon";
import { Label } from "@/components/ui/label";
import { AUTOMATIONS_MESSAGES } from "@/features/automations/constants";
import type { AiAgentItem } from "@/types/ai-agent.types";

type FollowUpAgentSelectProps = {
  agents: AiAgentItem[];
  value: string | null;
  disabled?: boolean;
  onChange: (agentId: string | null) => void;
};

export function FollowUpAgentSelect({
  agents,
  value,
  disabled = false,
  onChange,
}: FollowUpAgentSelectProps) {
  const enabledAgents = agents.filter((agent) => agent.enabled);

  return (
    <div className="space-y-2">
      <Label htmlFor="follow-up-agent-select">
        {AUTOMATIONS_MESSAGES.followUpAgentLabel}
      </Label>
      <select
        id="follow-up-agent-select"
        className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value ? event.target.value : null)
        }
      >
        <option value="">{AUTOMATIONS_MESSAGES.followUpAgentDefault}</option>
        {enabledAgents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>
      {value ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AiAgentIcon
            iconId={
              enabledAgents.find((agent) => agent.id === value)?.icon ?? "bot"
            }
            size="sm"
          />
          <span>{AUTOMATIONS_MESSAGES.followUpAgentSelectedHint}</span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {AUTOMATIONS_MESSAGES.followUpAgentDefaultHint}
        </p>
      )}
    </div>
  );
}
