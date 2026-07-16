"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { AiAgentScheduleEditor } from "@/components/ai-assistant/AiAgentScheduleEditor";
import { AiCommunicationStyleSelect } from "@/components/ai-assistant/AiCommunicationStyleSelect";
import { AiLanguageSelect } from "@/components/ai-assistant/AiLanguageSelect";
import { AiReplyWaitSelect } from "@/components/ai-assistant/AiReplyWaitSelect";
import { BusinessAiKeysPanel } from "@/components/ai-assistant/BusinessAiKeysPanel";
import { SalesAgentRulesPanel } from "@/components/ai-assistant/SalesAgentRulesPanel";
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
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { saveAiAssistantProfileAction } from "@/features/ai-assistant/actions/save-ai-assistant-profile";
import { saveFollowUpAgentSettingsAction } from "@/features/ai-assistant/actions/save-follow-up-agent-settings";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import {
  DEFAULT_COMMUNICATION_STYLE,
  isCommunicationStyleId,
  type CommunicationStyleId,
} from "@/features/ai-assistant/communication-styles";
import type {
  AiAssistantProfileData,
  CrmUpdateMode,
} from "@/types/ai-assistant-profile.types";
import type { AgentScheduleSlot } from "@/types/ai-assistant-schedule.types";
import type { AiWorkerReadiness } from "@/types/ai-worker-readiness.types";
import type { SalesAgentSettings } from "@/types/ai-usage.types";
import type { BusinessAiKeySettings } from "@/services/business-ai-keys.service";
import type { FollowUpAgentSettings } from "@/services/follow-up-settings.service";

type AiAssistantEditPanelProps = {
  profile: AiAssistantProfileData;
  followUpAgent: FollowUpAgentSettings;
  workerReadiness: AiWorkerReadiness;
  salesAgent: SalesAgentSettings;
  businessAiKeys: BusinessAiKeySettings;
  onBack?: () => void;
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
  followUpAgent,
  workerReadiness,
  salesAgent,
  businessAiKeys,
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
  const [replyWaitMs, setReplyWaitMs] = useState(profile.replyWaitMs);
  const [scheduleEnabled, setScheduleEnabled] = useState(profile.scheduleEnabled);
  const [scheduleTimezone, setScheduleTimezone] = useState(
    profile.scheduleTimezone,
  );
  const [scheduleSlots, setScheduleSlots] = useState<AgentScheduleSlot[]>(
    profile.scheduleSlots,
  );
  const [crmUpdateMode, setCrmUpdateMode] = useState<CrmUpdateMode>(
    profile.crmUpdateMode ?? "every_message",
  );
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
  const [followUpEnabled, setFollowUpEnabled] = useState(followUpAgent.enabled);
  const [deactivateStep, setDeactivateStep] = useState(0);

  const showCalendarBookingWarning =
    permissions.canCreateCalendarEvent &&
    !workerReadiness.googleCalendarConnected &&
    workerReadiness.resourceCount === 0 &&
    workerReadiness.bookingPageCount === 0;

  async function handleSave() {
    setIsSaving(true);

    try {
      const result = await saveAiAssistantProfileAction({
        name,
        systemPrompt,
        communicationStyle,
        language,
        replyWaitMs,
        scheduleEnabled,
        scheduleTimezone,
        scheduleSlots,
        crmUpdateMode,
        ...permissions,
      });

      if (!result.success) {
        toast.error(result.message ?? "Unable to save assistant settings.");
        return;
      }

      toast.success(AI_ASSISTANT_MESSAGES.assistantEditSaved);
      router.refresh();
      onBack?.();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFollowUpToggle(enabled: boolean) {
    setFollowUpEnabled(enabled);
    setIsSaving(true);

    try {
      const result = await saveFollowUpAgentSettingsAction({ enabled });

      if (!result.success) {
        toast.error(result.message ?? "Unable to save follow-up settings.");
        setFollowUpEnabled(followUpAgent.enabled);
        return;
      }

      toast.success(AI_ASSISTANT_MESSAGES.followUpAgentSaved);
      router.refresh();
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
        replyWaitMs,
        scheduleEnabled,
        scheduleTimezone,
        scheduleSlots,
        crmUpdateMode,
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
        {onBack ? (
          <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={onBack}>
            ← {AI_ASSISTANT_MESSAGES.assistantEditBack}
          </Button>
        ) : null}

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

            <AiReplyWaitSelect
              value={replyWaitMs}
              disabled={isSaving}
              onChange={setReplyWaitMs}
            />

            <AiLanguageSelect
              value={language}
              disabled={isSaving}
              onChange={setLanguage}
            />

            <AiAgentScheduleEditor
              enabled={scheduleEnabled}
              timezone={scheduleTimezone}
              slots={scheduleSlots}
              disabled={isSaving}
              onEnabledChange={setScheduleEnabled}
              onTimezoneChange={setScheduleTimezone}
              onSlotsChange={setScheduleSlots}
            />

            <div className="space-y-2">
              <Label htmlFor="crm-update-mode">
                {AI_ASSISTANT_MESSAGES.crmUpdateModeLabel}
              </Label>
              <p className="text-xs text-muted-foreground">
                {AI_ASSISTANT_MESSAGES.crmUpdateModeDescription}
              </p>
              <select
                id="crm-update-mode"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={crmUpdateMode}
                disabled={isSaving}
                onChange={(event) =>
                  setCrmUpdateMode(event.target.value as CrmUpdateMode)
                }
              >
                <option value="every_message">
                  {AI_ASSISTANT_MESSAGES.crmUpdateModeEveryMessage}
                </option>
                <option value="idle_5min">
                  {AI_ASSISTANT_MESSAGES.crmUpdateModeIdle5Min}
                </option>
                <option value="on_resolve">
                  {AI_ASSISTANT_MESSAGES.crmUpdateModeOnResolve}
                </option>
              </select>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <Label>{AI_ASSISTANT_MESSAGES.followUpAgentTitle}</Label>
                <p className="text-xs text-muted-foreground">
                  {AI_ASSISTANT_MESSAGES.followUpAgentDescription}
                </p>
              </div>
              <label className="flex items-start justify-between gap-3 text-sm">
                <span>{AI_ASSISTANT_MESSAGES.followUpAgentEnabled}</span>
                <input
                  type="checkbox"
                  className="mt-1 shrink-0"
                  checked={followUpEnabled}
                  disabled={isSaving}
                  onChange={(event) =>
                    void handleFollowUpToggle(event.target.checked)
                  }
                />
              </label>
              <p className="text-xs text-muted-foreground">
                {AI_ASSISTANT_MESSAGES.followUpAgentStats(followUpAgent.sentCount)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>{AI_ASSISTANT_MESSAGES.agentPermissionsTitle}</Label>
                <p className="text-xs text-muted-foreground">
                  {AI_ASSISTANT_MESSAGES.agentPermissionsHint}
                </p>
              </div>
              {showCalendarBookingWarning ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                  <p>{AI_ASSISTANT_MESSAGES.calendarBookingRequiresConnect}</p>
                  <Link
                    href={DASHBOARD_ROUTES.integrations}
                    className="mt-1 inline-block text-sm font-medium underline underline-offset-2"
                  >
                    Integrations
                  </Link>
                </div>
              ) : null}
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
              {onBack ? (
                <Button type="button" variant="outline" disabled={isSaving} onClick={onBack}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <SalesAgentRulesPanel initialSettings={salesAgent} />
        <BusinessAiKeysPanel initialSettings={businessAiKeys} />
      </div>
    </div>
  );
}
