"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { AgentConnectedChannelSelect } from "@/components/ai-assistant/AgentConnectedChannelSelect";
import { FollowUpAgentSelect } from "@/components/automations/FollowUpAgentSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAutomationWorkflowAction } from "@/features/automations/actions/create-automation-workflow";
import {
  AUTOMATION_ACTIONS,
  AUTOMATION_TRIGGERS,
  AUTOMATIONS_MESSAGES,
} from "@/features/automations/constants";
import {
  PIPELINE_STAGES,
  type AutomationActionType,
  type AutomationConfig,
  type AutomationTriggerType,
  type PipelineStage,
} from "@/features/automations/workflow-types";
import { CONTACTS_MESSAGES } from "@/features/contacts/constants";

const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  new: CONTACTS_MESSAGES.pipelineNew,
  qualified: CONTACTS_MESSAGES.pipelineQualified,
  proposal: CONTACTS_MESSAGES.pipelineProposal,
  won: CONTACTS_MESSAGES.pipelineWon,
  lost: CONTACTS_MESSAGES.pipelineLost,
};
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import type { AiAgentItem } from "@/types/ai-agent.types";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { buildAutomationsHref } from "@/utils/automations-url";

type AutomationCreateWizardProps = {
  step: 1 | 2 | 3;
  agents: AiAgentItem[];
  channelStatuses: IntegrationChannelStatusMap;
  visibleChannelIds: MessagingIntegrationChannelId[];
  onStepChange: (step: 1 | 2 | 3) => void;
  onCancel: () => void;
};

export function AutomationCreateWizard({
  step,
  agents,
  channelStatuses,
  visibleChannelIds,
  onStepChange,
  onCancel,
}: AutomationCreateWizardProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>("new_message");
  const [actionType, setActionType] = useState<AutomationActionType>("create_task");
  const [channels, setChannels] = useState<MessagingIntegrationChannelId[]>([]);
  const [aiAgentId, setAiAgentId] = useState<string | null>(null);
  const [pipelineStage, setPipelineStage] = useState<string>("qualified");
  const [taskTitle, setTaskTitle] = useState("");
  const [tagName, setTagName] = useState("");
  const [notifyTitle, setNotifyTitle] = useState("");

  function toggleChannel(channel: MessagingIntegrationChannelId) {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  }

  function buildConfig(): AutomationConfig {
    return {
      channels,
      ...(actionType === "send_message" ? { aiAgentId } : {}),
      ...(actionType === "update_stage"
        ? { pipelineStage: pipelineStage as AutomationConfig["pipelineStage"] }
        : {}),
      ...(actionType === "create_task" && taskTitle.trim()
        ? { taskTitle: taskTitle.trim() }
        : {}),
      ...(triggerType === "tag_added" && tagName.trim()
        ? { tagName: tagName.trim() }
        : {}),
      ...(actionType === "notify" && notifyTitle.trim()
        ? { notifyTitle: notifyTitle.trim() }
        : {}),
    };
  }

  async function handleCreate() {
    if (!name.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await createAutomationWorkflowAction({
        name: name.trim(),
        triggerType,
        actionType,
        enabled: true,
        config: buildConfig(),
      });

      if (!result.success) {
        toast.error(result.message ?? AUTOMATIONS_MESSAGES.saveFailed);
        return;
      }

      toast.success(AUTOMATIONS_MESSAGES.workflowSaved);
      router.push(
        buildAutomationsHref({
          tab: "rules",
          workflow: result.id ?? null,
        }),
      );
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">{AUTOMATIONS_MESSAGES.wizardTitle}</h2>
          <p className="text-xs text-muted-foreground">Step {step} of 3</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel}>
          <XIcon className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {step === 1 ? (
          <div className="mx-auto max-w-lg space-y-4">
            <div>
              <h3 className="font-medium">{AUTOMATIONS_MESSAGES.wizardStep1Title}</h3>
              <p className="text-sm text-muted-foreground">
                {AUTOMATIONS_MESSAGES.wizardStep1Description}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{AUTOMATIONS_MESSAGES.wizardNameLabel}</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={AUTOMATIONS_MESSAGES.wizardNamePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <select
                className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={triggerType}
                onChange={(event) =>
                  setTriggerType(event.target.value as AutomationTriggerType)
                }
              >
                {AUTOMATION_TRIGGERS.map((trigger) => (
                  <option key={trigger.id} value={trigger.id}>
                    {trigger.label}
                  </option>
                ))}
              </select>
            </div>
            {triggerType === "tag_added" ? (
              <div className="space-y-2">
                <Label>{AUTOMATIONS_MESSAGES.workflowTagLabel}</Label>
                <Input
                  value={tagName}
                  onChange={(event) => setTagName(event.target.value)}
                  placeholder="hot-lead"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mx-auto max-w-lg space-y-4">
            <div>
              <h3 className="font-medium">{AUTOMATIONS_MESSAGES.wizardStep2Title}</h3>
              <p className="text-sm text-muted-foreground">
                {AUTOMATIONS_MESSAGES.wizardStep2Description}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <select
                className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={actionType}
                onChange={(event) =>
                  setActionType(event.target.value as AutomationActionType)
                }
              >
                {AUTOMATION_ACTIONS.map((action) => (
                  <option key={action.id} value={action.id}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <AgentConnectedChannelSelect
                selectedChannels={channels}
                channelStatuses={channelStatuses}
                visibleChannelIds={visibleChannelIds}
                onToggle={toggleChannel}
              />
              <p className="text-xs text-muted-foreground">
                {AUTOMATIONS_MESSAGES.workflowChannelsHint}
              </p>
            </div>
            {actionType === "send_message" ? (
              <FollowUpAgentSelect
                agents={agents}
                value={aiAgentId}
                onChange={setAiAgentId}
              />
            ) : null}
            {actionType === "update_stage" ? (
              <div className="space-y-2">
                <Label>{AUTOMATIONS_MESSAGES.workflowPipelineLabel}</Label>
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={pipelineStage}
                  onChange={(event) => setPipelineStage(event.target.value)}
                >
                  {PIPELINE_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {PIPELINE_STAGE_LABELS[stage]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {actionType === "create_task" ? (
              <div className="space-y-2">
                <Label>{AUTOMATIONS_MESSAGES.workflowTaskTitleLabel}</Label>
                <Input
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  placeholder="Follow up with lead"
                />
              </div>
            ) : null}
            {actionType === "notify" ? (
              <div className="space-y-2">
                <Label>{AUTOMATIONS_MESSAGES.workflowNotifyLabel}</Label>
                <Input
                  value={notifyTitle}
                  onChange={(event) => setNotifyTitle(event.target.value)}
                  placeholder="Hot lead needs attention"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mx-auto max-w-lg space-y-4">
            <div>
              <h3 className="font-medium">{AUTOMATIONS_MESSAGES.wizardStep3Title}</h3>
              <p className="text-sm text-muted-foreground">
                {AUTOMATIONS_MESSAGES.wizardStep3Description}
              </p>
            </div>
            <div className="rounded-lg border p-4 text-sm space-y-2">
              <p>
                <span className="text-muted-foreground">Name:</span> {name}
              </p>
              <p>
                <span className="text-muted-foreground">When:</span>{" "}
                {AUTOMATION_TRIGGERS.find((item) => item.id === triggerType)?.label}
              </p>
              <p>
                <span className="text-muted-foreground">Then:</span>{" "}
                {AUTOMATION_ACTIONS.find((item) => item.id === actionType)?.label}
              </p>
              <p>
                <span className="text-muted-foreground">Channels:</span>{" "}
                {channels.length ? channels.join(", ") : "All connected"}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3">
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => onStepChange((step - 1) as 1 | 2 | 3)}
          >
            <ArrowLeftIcon className="size-4" />
            {AUTOMATIONS_MESSAGES.wizardBack}
          </Button>
        ) : (
          <div />
        )}
        {step < 3 ? (
          <Button
            type="button"
            disabled={step === 1 && !name.trim()}
            onClick={() => onStepChange((step + 1) as 2 | 3)}
          >
            {AUTOMATIONS_MESSAGES.wizardContinue}
            <ArrowRightIcon className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            disabled={isSaving || !name.trim()}
            onClick={() => void handleCreate()}
          >
            {isSaving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              AUTOMATIONS_MESSAGES.wizardCreate
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
