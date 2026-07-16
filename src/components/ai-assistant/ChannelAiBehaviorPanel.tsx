"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { AiReplyWaitSelect } from "@/components/ai-assistant/AiReplyWaitSelect";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { saveChannelAiBehaviorAction } from "@/features/channel-workspace/actions/save-channel-ai-behavior";
import { INTEGRATION_CHANNEL_LIST } from "@/features/integrations";
import type { AiAgentChannelId } from "@/features/integrations/constants";
import type { ChannelAiBehaviorSettings } from "@/types/channel-workspace.types";

type PermissionKey = keyof Omit<
  ChannelAiBehaviorSettings,
  "replyWaitMs" | "overridesEnabled"
>;

const CRM_PERMISSION_ROWS: Array<{
  key: PermissionKey;
  label: string;
  description?: string;
}> = [
  {
    key: "canCreateTask",
    label: "Create CRM tasks",
    description: "Follow-ups, callbacks, and reminders.",
  },
  {
    key: "canCreateDeal",
    label: "Create CRM deals",
    description: "Sales opportunities and quotes.",
  },
  {
    key: "canUpdateContact",
    label: "Update contact profile",
    description: "Name, email, phone, company, pipeline stage, tags.",
  },
  {
    key: "canAddNote",
    label: "Add contact notes",
    description: "Notes on the CRM contact card.",
  },
  {
    key: "canAddInternalNote",
    label: "Add manager notes in chat",
    description: "Team-only notes in the conversation sidebar.",
  },
  {
    key: "canCreateCalendarEvent",
    label: "Manage calendar bookings",
    description: "Create, reschedule, cancel, and schedule event reminders.",
  },
  {
    key: "canSendProactiveMessage",
    label: "Send proactive customer messages",
    description: "Status updates and reminders outside the main auto-reply.",
  },
];

const ALERT_PERMISSION_ROWS: Array<{
  key: PermissionKey;
  label: string;
  description?: string;
}> = [
  {
    key: "canRequestHuman",
    label: "Ask owner to join when needed",
    description: "Escalate complex or sensitive chats.",
  },
  {
    key: "canNotifyOwner",
    label: "Notify owner on human handoff",
    description: "Push alert when the agent requests a real person.",
  },
  {
    key: "canNotifyOnActions",
    label: "Notify owner on CRM actions",
    description: "Push alert when tasks, deals, or calendar events are created.",
  },
  {
    key: "canSummarizeActionsInChat",
    label: "Tell customer what was done",
    description: "Send a follow-up message summarizing CRM actions.",
  },
];

type ChannelAiBehaviorPanelProps = {
  channel: AiAgentChannelId;
  initialBehavior: ChannelAiBehaviorSettings;
};

export function ChannelAiBehaviorPanel({
  channel,
  initialBehavior,
}: ChannelAiBehaviorPanelProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [replyWaitMs, setReplyWaitMs] = useState(initialBehavior.replyWaitMs);
  const [permissions, setPermissions] = useState({
    canCreateTask: initialBehavior.canCreateTask,
    canCreateDeal: initialBehavior.canCreateDeal,
    canUpdateContact: initialBehavior.canUpdateContact,
    canAddNote: initialBehavior.canAddNote,
    canAddInternalNote: initialBehavior.canAddInternalNote,
    canCreateCalendarEvent: initialBehavior.canCreateCalendarEvent,
    canRequestHuman: initialBehavior.canRequestHuman,
    canNotifyOwner: initialBehavior.canNotifyOwner,
    canNotifyOnActions: initialBehavior.canNotifyOnActions,
    canSummarizeActionsInChat: initialBehavior.canSummarizeActionsInChat,
    canSendProactiveMessage: initialBehavior.canSendProactiveMessage,
  });

  const channelMeta = INTEGRATION_CHANNEL_LIST.find((item) => item.id === channel);
  const label = channelMeta?.label ?? channel;

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await saveChannelAiBehaviorAction({
        channel,
        replyWaitMs,
        ...permissions,
      });

      if (!result.success) {
        toast.error(result.message ?? AI_ASSISTANT_MESSAGES.channelAiBehaviorSaveFailed);
        return;
      }

      toast.success(AI_ASSISTANT_MESSAGES.channelAiBehaviorSaved);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  function renderPermissionRows(
    rows: Array<{ key: PermissionKey; label: string; description?: string }>,
  ) {
    return (
      <div className="space-y-3">
        {rows.map((row) => (
          <label
            key={row.key}
            className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border px-3 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{row.label}</p>
              {row.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {row.description}
                </p>
              ) : null}
            </div>
            <input
              type="checkbox"
              className="mt-1 size-4 accent-primary"
              checked={permissions[row.key]}
              disabled={isSaving}
              onChange={(event) =>
                setPermissions((prev) => ({
                  ...prev,
                  [row.key]: event.target.checked,
                }))
              }
            />
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" asChild>
          <Link href={DASHBOARD_ROUTES.aiAssistantChannels}>
            <ArrowLeftIcon className="size-4" />
            {AI_ASSISTANT_MESSAGES.channelAiBehaviorBack}
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl border bg-muted/30">
          <ChannelBrandIcon channel={channel} className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {AI_ASSISTANT_MESSAGES.channelAiBehaviorTitle(label)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {AI_ASSISTANT_MESSAGES.channelAiBehaviorDescription}
          </p>
        </div>
      </div>

      <Card className="shadow-none">
        <CardContent className="pt-6">
          <AiReplyWaitSelect
            value={replyWaitMs}
            disabled={isSaving}
            onChange={setReplyWaitMs}
          />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>{AI_ASSISTANT_MESSAGES.agentPermissionsTitle}</CardTitle>
          <CardDescription>
            {AI_ASSISTANT_MESSAGES.agentPermissionsHint}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {AI_ASSISTANT_MESSAGES.agentPermissionsCrmTitle}
            </p>
            {renderPermissionRows(CRM_PERMISSION_ROWS)}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {AI_ASSISTANT_MESSAGES.agentPermissionsAlertsTitle}
            </p>
            {renderPermissionRows(ALERT_PERMISSION_ROWS)}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
          {isSaving ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : null}
          {AI_ASSISTANT_MESSAGES.channelAiBehaviorSave}
        </Button>
      </div>
    </div>
  );
}
