"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { createAiAgentAction } from "@/features/ai-assistant/actions/create-ai-agent";
import { deleteAiAgentAction } from "@/features/ai-assistant/actions/delete-ai-agent";
import { AI_AGENT_TEMPLATES } from "@/features/ai-assistant/agent-templates";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { MESSAGING_INTEGRATION_CHANNELS } from "@/features/integrations/constants";
import type { AiAgentItem } from "@/types/ai-agent.types";
import type { MessagingChannel } from "@/types/database.types";

type AiAgentBuilderPanelProps = {
  agents: AiAgentItem[];
  activeChannel: MessagingChannel;
};

type DraftState = {
  name: string;
  systemPrompt: string;
  channels: MessagingChannel[];
  triggerKeywords: string;
  enabled: boolean;
};

const EMPTY_DRAFT: DraftState = {
  name: "",
  systemPrompt: "",
  channels: ["whatsapp"],
  triggerKeywords: "",
  enabled: true,
};

export function AiAgentBuilderPanel({
  agents,
  activeChannel,
}: AiAgentBuilderPanelProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState>({
    ...EMPTY_DRAFT,
    channels: [activeChannel],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function applyTemplate(templateId: string) {
    const template = AI_AGENT_TEMPLATES.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    setDraft({
      name: template.draft.name,
      systemPrompt: template.draft.systemPrompt,
      channels: [activeChannel],
      triggerKeywords: template.draft.triggerKeywords.join(", "),
      enabled: template.draft.enabled ?? true,
    });
  }

  function toggleChannel(channel: MessagingChannel) {
    setDraft((value) => {
      const hasChannel = value.channels.includes(channel);

      return {
        ...value,
        channels: hasChannel
          ? value.channels.filter((item) => item !== channel)
          : [...value.channels, channel],
      };
    });
  }

  async function handleSave() {
    setIsSaving(true);

    try {
      const result = await createAiAgentAction({
        name: draft.name,
        systemPrompt: draft.systemPrompt,
        channels: draft.channels,
        triggerKeywords: draft.triggerKeywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean),
        enabled: draft.enabled,
      });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(AI_ASSISTANT_MESSAGES.agentSaved);
      setDraft({ ...EMPTY_DRAFT, channels: [activeChannel] });
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);

    try {
      const result = await deleteAiAgentAction({ id });

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success(AI_ASSISTANT_MESSAGES.agentDeleted);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">
          {AI_ASSISTANT_MESSAGES.agentBuilderTitle}
        </CardTitle>
        <CardDescription>
          {AI_ASSISTANT_MESSAGES.agentBuilderDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {AI_AGENT_TEMPLATES.map((template) => (
            <Button
              key={template.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyTemplate(template.id)}
            >
              {template.label}
            </Button>
          ))}
        </div>

        {agents.length > 0 ? (
          <ul className="space-y-2">
            {agents.map((agent) => (
              <li
                key={agent.id}
                className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-caption line-clamp-2">
                    {agent.triggerKeywords.join(", ") || "No triggers"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={deletingId === agent.id}
                  onClick={() => {
                    void handleDelete(agent.id);
                  }}
                >
                  {deletingId === agent.id ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <Trash2Icon className="size-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
          <div className="space-y-2">
            <Label htmlFor="agent-name">{AI_ASSISTANT_MESSAGES.agentName}</Label>
            <Input
              id="agent-name"
              value={draft.name}
              onChange={(event) =>
                setDraft((value) => ({ ...value, name: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-prompt">
              {AI_ASSISTANT_MESSAGES.agentPrompt}
            </Label>
            <Textarea
              id="agent-prompt"
              value={draft.systemPrompt}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  systemPrompt: event.target.value,
                }))
              }
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label>{AI_ASSISTANT_MESSAGES.agentChannels}</Label>
            <div className="flex flex-wrap gap-2">
              {MESSAGING_INTEGRATION_CHANNELS.map((channel) => (
                <Button
                  key={channel}
                  type="button"
                  size="sm"
                  variant={
                    draft.channels.includes(channel) ? "default" : "outline"
                  }
                  onClick={() => toggleChannel(channel)}
                >
                  {channel}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-triggers">
              {AI_ASSISTANT_MESSAGES.agentTriggers}
            </Label>
            <Input
              id="agent-triggers"
              value={draft.triggerKeywords}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  triggerKeywords: event.target.value,
                }))
              }
              placeholder="price, demo, book"
            />
          </div>
          <Button
            type="button"
            disabled={
              isSaving ||
              !draft.name.trim() ||
              !draft.systemPrompt.trim() ||
              draft.channels.length === 0
            }
            onClick={() => {
              void handleSave();
            }}
          >
            {isSaving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <>
                <PlusIcon className="size-4" />
                {AI_ASSISTANT_MESSAGES.agentCreate}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
