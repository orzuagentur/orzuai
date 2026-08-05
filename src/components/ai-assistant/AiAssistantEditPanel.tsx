"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftIcon,
  DatabaseIcon,
  Loader2Icon,
  MessageSquareIcon,
  PhoneCallIcon,
  PowerIcon,
  Settings2Icon,
  ShieldIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AiAgentScheduleEditor } from "@/components/ai-assistant/AiAgentScheduleEditor";
import { AiCommunicationStyleSelect } from "@/components/ai-assistant/AiCommunicationStyleSelect";
import { AiLanguageSelect } from "@/components/ai-assistant/AiLanguageSelect";
import { AiReplyWaitSelect } from "@/components/ai-assistant/AiReplyWaitSelect";
import { AiVoiceAgentPanel } from "@/components/ai-assistant/AiVoiceAgentPanel";
import { DataCollectionFieldsEditor } from "@/components/ai-assistant/DataCollectionFieldsEditor";
import { SalesAgentRulesPanel } from "@/components/ai-assistant/SalesAgentRulesPanel";
import {
  type CollectionNiche,
  type DataCollectionField,
} from "@/lib/ai/data-collection";
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
import { activateAiAgentAction } from "@/features/ai-assistant/actions/activate-ai-agent";
import { saveAiAssistantProfileAction } from "@/features/ai-assistant/actions/save-ai-assistant-profile";
import { saveFollowUpAgentSettingsAction } from "@/features/ai-assistant/actions/save-follow-up-agent-settings";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import {
  DEFAULT_COMMUNICATION_STYLE,
  isCommunicationStyleId,
  type CommunicationStyleId,
} from "@/features/ai-assistant/communication-styles";
import { getNavSegmentActiveClassName } from "@/features/navigation/channel-rail-ui";
import { cn } from "@/lib/utils";
import type {
  AiAssistantProfileData,
  CrmUpdateMode,
} from "@/types/ai-assistant-profile.types";
import type { AiIntensity } from "@/lib/ai/ai-intensity";
import type { AgentScheduleSlot } from "@/types/ai-assistant-schedule.types";
import type { AiWorkerReadiness } from "@/types/ai-worker-readiness.types";
import type { SalesAgentSettings } from "@/types/ai-usage.types";
import type { FollowUpAgentSettings } from "@/services/follow-up-settings.service";
import type { TwilioPhoneNumberOption } from "@/types/twilio-integration.types";
import type {
  VoiceAgentSettings,
  VoiceConnectionData,
} from "@/types/voice-agent.types";

type SettingsTabId =
  | "behavior"
  | "permissions"
  | "data-collection"
  | "schedule"
  | "sales"
  | "voice"
  | "activation";

type AiAssistantEditPanelProps = {
  profile: AiAssistantProfileData;
  followUpAgent: FollowUpAgentSettings;
  workerReadiness: AiWorkerReadiness;
  salesAgent: SalesAgentSettings;
  elevenLabsConfigured?: boolean;
  voiceConnection?: VoiceConnectionData | null;
  voiceSettings?: VoiceAgentSettings | null;
  availablePhoneNumbers?: TwilioPhoneNumberOption[];
  initialTab?: SettingsTabId;
  setupMode?: boolean;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
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
  | "canSendProactiveMessage"
  | "canReply"
>;

const SETTINGS_TABS: Array<{
  id: SettingsTabId;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: "behavior",
    label: AI_ASSISTANT_MESSAGES.settingsTabBehavior,
    description: AI_ASSISTANT_MESSAGES.settingsTabBehaviorHint,
    icon: MessageSquareIcon,
  },
  {
    id: "permissions",
    label: AI_ASSISTANT_MESSAGES.settingsTabPermissions,
    description: AI_ASSISTANT_MESSAGES.settingsTabPermissionsHint,
    icon: ShieldIcon,
  },
  {
    id: "data-collection",
    label: AI_ASSISTANT_MESSAGES.settingsTabDataCollection,
    description: AI_ASSISTANT_MESSAGES.settingsTabDataCollectionHint,
    icon: DatabaseIcon,
  },
  {
    id: "schedule",
    label: AI_ASSISTANT_MESSAGES.settingsTabSchedule,
    description: AI_ASSISTANT_MESSAGES.settingsTabScheduleHint,
    icon: Settings2Icon,
  },
  {
    id: "sales",
    label: AI_ASSISTANT_MESSAGES.settingsTabSales,
    description: AI_ASSISTANT_MESSAGES.settingsTabSalesHint,
    icon: SparklesIcon,
  },
  {
    id: "voice",
    label: AI_ASSISTANT_MESSAGES.settingsTabVoice,
    description: AI_ASSISTANT_MESSAGES.settingsTabVoiceHint,
    icon: PhoneCallIcon,
  },
  {
    id: "activation",
    label: AI_ASSISTANT_MESSAGES.settingsTabActivation,
    description: AI_ASSISTANT_MESSAGES.settingsTabActivationHint,
    icon: PowerIcon,
  },
];

const SETUP_STEPS: Array<{ id: SettingsTabId; label: string }> = [
  { id: "behavior", label: "1. Behavior" },
  { id: "voice", label: "2. Voice calls" },
  { id: "activation", label: "3. Activate" },
];

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

const TABS_WITH_PROFILE_SAVE = new Set<SettingsTabId>([
  "behavior",
  "permissions",
  "data-collection",
  "schedule",
]);

function saveSuccessMessage(tab: SettingsTabId): string {
  switch (tab) {
    case "behavior":
      return AI_ASSISTANT_MESSAGES.settingsSavedBehavior;
    case "permissions":
      return AI_ASSISTANT_MESSAGES.settingsSavedPermissions;
    case "data-collection":
      return AI_ASSISTANT_MESSAGES.settingsSavedDataCollection;
    case "schedule":
      return AI_ASSISTANT_MESSAGES.settingsSavedSchedule;
    case "activation":
      return AI_ASSISTANT_MESSAGES.settingsSavedActivation;
    default:
      return AI_ASSISTANT_MESSAGES.assistantEditSaved;
  }
}

export function AiAssistantEditPanel({
  profile,
  followUpAgent,
  workerReadiness,
  salesAgent,
  elevenLabsConfigured = false,
  voiceConnection = null,
  voiceSettings = null,
  availablePhoneNumbers = [],
  initialTab = "behavior",
  setupMode = false,
  onBack,
  backHref = DASHBOARD_ROUTES.aiAssistant,
  backLabel = AI_ASSISTANT_MESSAGES.assistantEditBack,
}: AiAssistantEditPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [isSetupMode] = useState(setupMode);
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
  const [aiIntensity, setAiIntensity] = useState<AiIntensity>(
    profile.aiIntensity ?? "light",
  );
  const [collectionNiche, setCollectionNiche] = useState<CollectionNiche>(
    profile.collectionNiche ?? "generic",
  );
  const [dataCollectionFields, setDataCollectionFields] = useState<
    DataCollectionField[]
  >(profile.dataCollectionFields ?? []);
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
    canSendProactiveMessage: profile.canSendProactiveMessage ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [followUpEnabled, setFollowUpEnabled] = useState(followUpAgent.enabled);
  const [deactivateStep, setDeactivateStep] = useState(0);

  const requiredReady =
    name.trim().length >= 1 &&
    systemPrompt.trim().length >= 20 &&
    Boolean(language) &&
    Boolean(communicationStyle);

  const missingRequired: string[] = [];
  if (name.trim().length < 1) missingRequired.push("Agent name");
  if (systemPrompt.trim().length < 20) {
    missingRequired.push("Instructions (at least 20 characters)");
  }
  if (!language) missingRequired.push("Language");
  if (!communicationStyle) missingRequired.push("Communication style");

  const showCalendarBookingWarning =
    permissions.canCreateCalendarEvent &&
    !workerReadiness.googleCalendarConnected &&
    workerReadiness.resourceCount === 0 &&
    workerReadiness.bookingPageCount === 0;

  const activeTabMeta =
    SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0]!;
  const ActiveTabIcon = activeTabMeta.icon;

  async function saveProfile(successMessage: string): Promise<boolean> {
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
        aiIntensity,
        collectionNiche,
        dataCollectionFields,
        ...permissions,
      });

      if (!result.success) {
        toast.error(result.message ?? "Unable to save assistant settings.");
        return false;
      }

      toast.success(successMessage);
      router.refresh();
      return true;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveCurrentTab() {
    await saveProfile(saveSuccessMessage(activeTab));
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

      toast.success(
        enabled
          ? AI_ASSISTANT_MESSAGES.settingsFollowUpEnabled
          : AI_ASSISTANT_MESSAGES.settingsFollowUpDisabled,
      );
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
        aiIntensity,
        collectionNiche,
        dataCollectionFields,
        ...nextPermissions,
      });

      if (!result.success) {
        toast.error(result.message ?? "Unable to save agent settings.");
        return false;
      }

      setPermissions(nextPermissions);
      toast.success(
        nextPermissions.canReply
          ? AI_ASSISTANT_MESSAGES.settingsAgentActivated
          : AI_ASSISTANT_MESSAGES.settingsAgentDeactivated,
      );
      router.refresh();
      return true;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeactivateClick() {
    if (permissions.canReply === false) {
      if (!requiredReady) {
        toast.error("Fill required Behavior fields before activating.");
        setActiveTab("behavior");
        return;
      }

      setIsActivating(true);
      try {
        const saved = await saveProfile("Settings saved.");
        if (!saved) {
          return;
        }

        const result = await activateAiAgentAction();
        if (!result.success) {
          toast.error(result.message ?? "Unable to activate AI Agent.");
          return;
        }

        setPermissions((current) => ({ ...current, canReply: true }));
        toast.success(
          result.enabledChannels > 0
            ? `AI Agent activated on ${result.enabledChannels} channel(s).`
            : AI_ASSISTANT_MESSAGES.settingsAgentActivated,
        );
        setDeactivateStep(0);
        router.refresh();
        if (isSetupMode) {
          router.push(DASHBOARD_ROUTES.aiAssistant);
        }
      } finally {
        setIsActivating(false);
      }
      return;
    }

    if (deactivateStep < 2) {
      setDeactivateStep((current) => current + 1);
      toast.message(
        deactivateStep === 0
          ? AI_ASSISTANT_MESSAGES.settingsDeactivateStep1
          : AI_ASSISTANT_MESSAGES.settingsDeactivateStep2,
      );
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

  function goToNextSetupStep() {
    const index = SETUP_STEPS.findIndex((step) => step.id === activeTab);
    const next = SETUP_STEPS[index + 1];
    if (next) {
      setActiveTab(next.id);
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

  function renderTabContent() {
    switch (activeTab) {
      case "behavior":
        return (
          <div className="space-y-6">
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
                rows={14}
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                placeholder={AI_ASSISTANT_MESSAGES.assistantBehaviorPlaceholder}
                className="min-h-[18rem]"
              />
              <p className="text-xs text-muted-foreground">
                {AI_ASSISTANT_MESSAGES.assistantBehaviorHint}
              </p>
            </div>

            <AiCommunicationStyleSelect
              value={communicationStyle}
              disabled={isSaving}
              onChange={(value) => {
                setCommunicationStyle(value);
                toast.message(
                  AI_ASSISTANT_MESSAGES.settingsPendingStyle(value),
                );
              }}
            />

            <AiReplyWaitSelect
              value={replyWaitMs}
              disabled={isSaving}
              onChange={(value) => {
                setReplyWaitMs(value);
                toast.message(
                  AI_ASSISTANT_MESSAGES.settingsPendingReplyWait(value),
                );
              }}
            />

            <AiLanguageSelect
              value={language}
              disabled={isSaving}
              onChange={(value) => {
                setLanguage(value);
                toast.message(
                  AI_ASSISTANT_MESSAGES.settingsPendingLanguage(value),
                );
              }}
            />
          </div>
        );

      case "permissions":
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.agentPermissionsHint}
            </p>
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
        );

      case "data-collection":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.dataCollectionDescription}
            </p>
            <DataCollectionFieldsEditor
              niche={collectionNiche}
              fields={dataCollectionFields}
              onNicheChange={(niche) => {
                setCollectionNiche(niche);
                toast.message(
                  AI_ASSISTANT_MESSAGES.settingsPendingNiche(niche),
                );
              }}
              onFieldsChange={setDataCollectionFields}
            />
          </div>
        );

      case "schedule":
        return (
          <div className="space-y-6">
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
                onChange={(event) => {
                  const next = event.target.value as CrmUpdateMode;
                  setCrmUpdateMode(next);
                  toast.message(
                    AI_ASSISTANT_MESSAGES.settingsPendingCrmMode(next),
                  );
                }}
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

            <div className="space-y-2">
              <Label htmlFor="ai-intensity">
                {AI_ASSISTANT_MESSAGES.aiIntensityLabel}
              </Label>
              <p className="text-xs text-muted-foreground">
                {AI_ASSISTANT_MESSAGES.aiIntensityDescription}
              </p>
              <select
                id="ai-intensity"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={aiIntensity}
                disabled={isSaving}
                onChange={(event) => {
                  setAiIntensity(event.target.value as AiIntensity);
                }}
              >
                <option value="light">
                  {AI_ASSISTANT_MESSAGES.aiIntensityLight}
                </option>
                <option value="full">
                  {AI_ASSISTANT_MESSAGES.aiIntensityFull}
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
                {AI_ASSISTANT_MESSAGES.followUpAgentStats(
                  followUpAgent.sentCount,
                )}
              </p>
            </div>
          </div>
        );

      case "sales":
        return <SalesAgentRulesPanel initialSettings={salesAgent} />;

      case "voice":
        return (
          <AiVoiceAgentPanel
            profile={profile}
            elevenLabsConfigured={elevenLabsConfigured}
            voiceConnection={voiceConnection}
            voiceSettings={voiceSettings}
            availablePhoneNumbers={availablePhoneNumbers}
          />
        );

      case "activation":
        return (
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">
                Status:{" "}
                <span
                  className={
                    permissions.canReply ? "text-zinc-600" : "text-destructive"
                  }
                >
                  {permissions.canReply ? "Active" : "Deactivated"}
                </span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {permissions.canReply
                  ? "Deactivating stops autonomous customer replies. CRM and calendar actions will not run until you activate the agent again."
                  : "Complete required Behavior settings, optionally configure Calls AI for calls, then activate the agent."}
              </p>
            </div>

            {!permissions.canReply ? (
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-sm font-medium">Required before activation</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {[
                    {
                      ok: name.trim().length >= 1,
                      label: "Agent name",
                    },
                    {
                      ok: systemPrompt.trim().length >= 20,
                      label: "Instructions (20+ characters)",
                    },
                    {
                      ok: Boolean(language),
                      label: "Language",
                    },
                    {
                      ok: Boolean(communicationStyle),
                      label: "Communication style",
                    },
                  ].map((item) => (
                    <li
                      key={item.label}
                      className={
                        item.ok ? "text-zinc-700" : "text-amber-700"
                      }
                    >
                      {item.ok ? "✓" : "○"} {item.label}
                    </li>
                  ))}
                </ul>
                {!requiredReady ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setActiveTab("behavior")}
                  >
                    Open Behavior settings
                  </Button>
                ) : null}
              </div>
            ) : null}

            <Button
              type="button"
              variant={permissions.canReply ? "destructive" : "default"}
              disabled={
                isSaving ||
                isActivating ||
                (!permissions.canReply && !requiredReady)
              }
              onClick={() => void handleDeactivateClick()}
            >
              {isActivating ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Activating...
                </>
              ) : permissions.canReply ? (
                deactivateStep === 0 ? (
                  "Deactivate agent"
                ) : deactivateStep === 1 ? (
                  "Confirm deactivation"
                ) : (
                  "Final confirm"
                )
              ) : (
                "Activate agent"
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-20 flex shrink-0 items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {onBack ? (
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeftIcon className="size-4" />
            {backLabel}
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href={backHref}>
              <ArrowLeftIcon className="size-4" />
              {backLabel}
            </Link>
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {isSetupMode
              ? "Set up AI Agent"
              : AI_ASSISTANT_MESSAGES.assistantEditTitle}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {activeTabMeta.label}
          </p>
        </div>
      </div>

      {isSetupMode ? (
        <div className="shrink-0 border-b bg-muted/20 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {SETUP_STEPS.map((step) => {
              const isActive = activeTab === step.id;
              const stepIndex = SETUP_STEPS.findIndex((item) => item.id === step.id);
              const activeIndex = SETUP_STEPS.findIndex(
                (item) => item.id === activeTab,
              );
              const isDone = activeIndex > stepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveTab(step.id)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs transition-colors sm:text-sm",
                    isActive
                      ? "border-violet-200 bg-violet-50 font-medium text-violet-900"
                      : isDone
                        ? "border-zinc-200 bg-zinc-50 text-zinc-800"
                        : "bg-background text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-y-auto border-b bg-muted/10 lg:border-b-0 lg:border-r">
          <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:p-3">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors lg:w-full",
                    getNavSegmentActiveClassName(isActive),
                  )}
                >
                  <Icon className="size-4 shrink-0 opacity-80" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex min-h-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            <Card className="flex min-h-[calc(100vh-12rem)] flex-col shadow-none">
              <CardHeader className="border-b">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                    <ActiveTabIcon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-lg">{activeTabMeta.label}</CardTitle>
                    <CardDescription className="mt-1">
                      {activeTabMeta.description}
                    </CardDescription>
                    {activeTab === "behavior" ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {AI_ASSISTANT_MESSAGES.assistantReplyEngineNote}
                      </p>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex-1">{renderTabContent()}</div>

                {TABS_WITH_PROFILE_SAVE.has(activeTab) ||
                (isSetupMode &&
                  (activeTab === "behavior" || activeTab === "voice")) ? (
                  <div className="sticky bottom-0 -mx-4 mt-auto border-t bg-card px-4 py-4 md:-mx-6 md:px-6">
                    <div className="flex flex-wrap items-center gap-2">
                      {TABS_WITH_PROFILE_SAVE.has(activeTab) ? (
                        <Button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void handleSaveCurrentTab()}
                        >
                          {isSaving ? (
                            <>
                              <Loader2Icon className="size-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            AI_ASSISTANT_MESSAGES.settingsSaveTab
                          )}
                        </Button>
                      ) : null}
                      {isSetupMode &&
                      (activeTab === "behavior" || activeTab === "voice") ? (
                        <Button
                          type="button"
                          variant={
                            TABS_WITH_PROFILE_SAVE.has(activeTab)
                              ? "secondary"
                              : "default"
                          }
                          disabled={
                            activeTab === "behavior" && !requiredReady
                          }
                          onClick={() => {
                            if (activeTab === "behavior" && !requiredReady) {
                              toast.error(
                                `Required: ${missingRequired.join(", ")}`,
                              );
                              return;
                            }
                            goToNextSetupStep();
                          }}
                        >
                          Continue
                        </Button>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {isSetupMode
                          ? "Complete each step, then activate the agent."
                          : AI_ASSISTANT_MESSAGES.settingsSaveHint}
                      </p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
