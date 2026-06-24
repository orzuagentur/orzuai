"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { AiCommunicationStyleSelect } from "@/components/ai-assistant/AiCommunicationStyleSelect";
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
import { saveAiAssistantProfileAction } from "@/features/ai-assistant/actions/save-ai-assistant-profile";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import {
  DEFAULT_COMMUNICATION_STYLE,
  isCommunicationStyleId,
  type CommunicationStyleId,
} from "@/features/ai-assistant/communication-styles";
import type { AiAssistantProfileData } from "@/types/ai-assistant-profile.types";
import { AI_LANGUAGE_OPTIONS } from "@/types/channel-workspace.types";

type AiAssistantEditPanelProps = {
  profile: AiAssistantProfileData;
  onBack: () => void;
};

type AgentPermissions = Pick<
  AiAssistantProfileData,
  | "canCreateTask"
  | "canCreateDeal"
  | "canUpdateContact"
  | "canAddNote"
  | "canAddInternalNote"
  | "canCreateCalendarEvent"
  | "canRequestHuman"
  | "canNotifyOwner"
  | "canNotifyOnActions"
  | "canSummarizeActionsInChat"
  | "canReply"
>;

const CRM_PERMISSION_ROWS: Array<{
  key: keyof AgentPermissions;
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
    label: "Create Google Calendar events",
    description: "Bookings when Google Calendar is connected.",
  },
];

const ALERT_PERMISSION_ROWS: Array<{
  key: keyof AgentPermissions;
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

export function AiAssistantEditPanel({
  profile,
  onBack,
}: AiAssistantEditPanelProps) {
  const router = useRouter();
  const [name, setName] = useState(profile.name);
  const [systemPrompt, setSystemPrompt] = useState(profile.systemPrompt);
  const [communicationStyle, setCommunicationStyle] = useState<CommunicationStyleId>(
    isCommunicationStyleId(profile.communicationStyle)
      ? profile.communicationStyle
      : DEFAULT_COMMUNICATION_STYLE,
  );
  const [language, setLanguage] = useState(profile.language);
  const [permissions, setPermissions] = useState<AgentPermissions>({
    canReply: profile.canReply,
    canCreateTask: profile.canCreateTask,
    canCreateDeal: profile.canCreateDeal,
    canUpdateContact: profile.canUpdateContact,
    canAddNote: profile.canAddNote,
    canAddInternalNote: profile.canAddInternalNote,
    canCreateCalendarEvent: profile.canCreateCalendarEvent,
    canRequestHuman: profile.canRequestHuman,
    canNotifyOwner: profile.canNotifyOwner,
    canNotifyOnActions: profile.canNotifyOnActions,
    canSummarizeActionsInChat: profile.canSummarizeActionsInChat,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deactivateStep, setDeactivateStep] = useState(0);

  async function handleSave() {
    setIsSaving(true);

    try {
      const result = await saveAiAssistantProfileAction({
        name,
        systemPrompt,
        communicationStyle,
        language,
        ...permissions,
      });

      if (!result.success) {
        toast.error(result.message ?? "Unable to save assistant settings.");
        return;
      }

      toast.success(AI_ASSISTANT_MESSAGES.assistantEditSaved);
      router.refresh();
      onBack();
    } finally {
      setIsSaving(false);
    }
  }

  async function saveWithPermissions(nextPermissions: AgentPermissions) {
    setIsSaving(true);

    try {
      const result = await saveAiAssistantProfileAction({
        name,
        systemPrompt,
        communicationStyle,
        language,
        ...nextPermissions,
      });

      if (!result.success) {
        toast.error(result.message ?? "Unable to save agent settings.");
        return false;
      }

      setPermissions(nextPermissions);
      toast.success(AI_ASSISTANT_MESSAGES.assistantEditSaved);
      router.refresh();
      return true;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivateClick() {
    if (permissions.canReply === false) {
      const reactivated = await saveWithPermissions({
        ...permissions,
        canReply: true,
      });

      if (reactivated) {
        setDeactivateStep(0);
      }
      return;
    }

    if (deactivateStep < 2) {
      setDeactivateStep((current) => current + 1);
      return;
    }

    const deactivated = await saveWithPermissions({
      ...permissions,
      canReply: false,
    });

    if (deactivated) {
      setDeactivateStep(0);
    }
  }

  function renderPermissionGroup(
    title: string,
    rows: typeof CRM_PERMISSION_ROWS,
  ) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{title}</p>
        {rows.map(({ key, label, description }) => (
          <label
            key={key}
            className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm"
          >
            <span className="min-w-0">
              <span className="block">{label}</span>
              {description ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {description}
                </span>
              ) : null}
            </span>
            <input
              type="checkbox"
              className="mt-1 shrink-0"
              checked={permissions[key]}
              disabled={isSaving}
              onChange={(event) =>
                setPermissions((current) => ({
                  ...current,
                  [key]: event.target.checked,
                }))
              }
            />
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6">
        <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={onBack}>
          ← {AI_ASSISTANT_MESSAGES.assistantEditBack}
        </Button>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{AI_ASSISTANT_MESSAGES.assistantEditTitle}</CardTitle>
            <CardDescription>
              {AI_ASSISTANT_MESSAGES.assistantEditFormDescription}
            </CardDescription>
            <p className="text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.assistantReplyEngineNote}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="assistant-name">
                {AI_ASSISTANT_MESSAGES.assistantNameLabel}
              </Label>
              <Input
                id="assistant-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={AI_ASSISTANT_MESSAGES.assistantNamePlaceholder}
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assistant-behavior">
                {AI_ASSISTANT_MESSAGES.assistantBehaviorLabel}
              </Label>
              <Textarea
                id="assistant-behavior"
                rows={8}
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                placeholder={AI_ASSISTANT_MESSAGES.assistantBehaviorPlaceholder}
              />
              <p className="text-xs text-muted-foreground">
                {AI_ASSISTANT_MESSAGES.assistantBehaviorHint}
              </p>
            </div>

            <AiCommunicationStyleSelect
              value={communicationStyle}
              disabled={isSaving}
              onChange={setCommunicationStyle}
            />

            <div className="space-y-2">
              <Label htmlFor="assistant-language">
                {AI_ASSISTANT_MESSAGES.assistantLanguageLabel}
              </Label>
              <select
                id="assistant-language"
                className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={language}
                disabled={isSaving}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {AI_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <div>
                <Label>{AI_ASSISTANT_MESSAGES.agentPermissionsTitle}</Label>
                <p className="text-xs text-muted-foreground">
                  {AI_ASSISTANT_MESSAGES.agentPermissionsHint}
                </p>
              </div>
              {renderPermissionGroup(
                AI_ASSISTANT_MESSAGES.agentPermissionsCrmTitle,
                CRM_PERMISSION_ROWS,
              )}
              {renderPermissionGroup(
                AI_ASSISTANT_MESSAGES.agentPermissionsAlertsTitle,
                ALERT_PERMISSION_ROWS,
              )}
            </div>

            <Card className="border-destructive/30 shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Agent activation</CardTitle>
                <CardDescription>
                  Deactivating stops autonomous customer replies. CRM/calendar
                  actions will not run until you activate the agent again.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Status: {permissions.canReply ? "Active" : "Deactivated"}
                </p>
                <Button
                  type="button"
                  variant={permissions.canReply ? "destructive" : "default"}
                  disabled={isSaving}
                  onClick={() => void handleDeactivateClick()}
                >
                  {permissions.canReply
                    ? deactivateStep === 0
                      ? "Deactivate agent"
                      : deactivateStep === 1
                        ? "Confirm deactivation"
                        : "Final confirm"
                    : "Activate agent"}
                </Button>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={isSaving} onClick={() => void handleSave()}>
                {isSaving ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  AI_ASSISTANT_MESSAGES.assistantEditSave
                )}
              </Button>
              <Button type="button" variant="outline" disabled={isSaving} onClick={onBack}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
