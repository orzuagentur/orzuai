"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";

import { AutomationsChannelBadgeRow } from "@/components/automations/AutomationsChannelBadgeRow";
import { AutomationOnOffControl } from "@/components/automations/AutomationOnOffControl";
import { FollowUpAgentSelect } from "@/components/automations/FollowUpAgentSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { saveFollowUpAgentSettingsAction } from "@/features/ai-assistant/actions/save-follow-up-agent-settings";
import { saveSalesAgentSettingsAction } from "@/features/ai-assistant/actions/save-sales-agent-settings";
import {
  getAutomationRule,
  type AutomationRuleId,
} from "@/features/automations/rule-catalog";
import { AUTOMATIONS_MESSAGES } from "@/features/automations/constants";
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import type { AiAgentItem } from "@/types/ai-agent.types";
import type { SalesAgentSettings } from "@/types/ai-usage.types";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import type { FollowUpAgentSettings } from "@/services/follow-up-settings.service";

type AutomationsRuleDetailPanelProps = {
  ruleId: AutomationRuleId;
  salesAgent: SalesAgentSettings;
  followUpAgent: FollowUpAgentSettings;
  agents: AiAgentItem[];
  channelStatuses: IntegrationChannelStatusMap;
  visibleChannelIds: MessagingIntegrationChannelId[];
  onBack?: () => void;
};

export function AutomationsRuleDetailPanel({
  ruleId,
  salesAgent,
  followUpAgent,
  agents,
  channelStatuses,
  visibleChannelIds,
  onBack,
}: AutomationsRuleDetailPanelProps) {
  const router = useRouter();
  const rule = getAutomationRule(ruleId);
  const Icon = rule.icon;

  const [salesSettings, setSalesSettings] = useState(salesAgent);
  const [followUpEnabled, setFollowUpEnabled] = useState(followUpAgent.enabled);
  const [followUpAgentId, setFollowUpAgentId] = useState(
    followUpAgent.aiAgentId,
  );
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSalesSettings(salesAgent);
    setFollowUpEnabled(followUpAgent.enabled);
    setFollowUpAgentId(followUpAgent.aiAgentId);
  }, [salesAgent, followUpAgent]);

  async function persistSalesSettings(next: SalesAgentSettings) {
    setIsSaving(true);

    try {
      const result = await saveSalesAgentSettingsAction(next);

      if (!result.success) {
        toast.error(result.message ?? AUTOMATIONS_MESSAGES.ruleSaveFailed);
        setSalesSettings(salesAgent);
        return;
      }

      toast.success(AUTOMATIONS_MESSAGES.ruleSaved);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function persistFollowUp(input: {
    enabled?: boolean;
    aiAgentId?: string | null;
  }) {
    setIsSaving(true);

    const nextEnabled = input.enabled ?? followUpEnabled;
    const nextAgentId =
      input.aiAgentId !== undefined ? input.aiAgentId : followUpAgentId;

    try {
      const result = await saveFollowUpAgentSettingsAction({
        enabled: nextEnabled,
        aiAgentId: nextAgentId,
      });

      if (!result.success) {
        toast.error(result.message ?? AUTOMATIONS_MESSAGES.ruleSaveFailed);
        setFollowUpEnabled(followUpAgent.enabled);
        setFollowUpAgentId(followUpAgent.aiAgentId);
        return;
      }

      toast.success(AUTOMATIONS_MESSAGES.ruleSaved);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  function scheduleSalesSave(next: SalesAgentSettings) {
    setSalesSettings(next);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      void persistSalesSettings(next);
    }, 500);
  }

  function handleSalesToggle(field: keyof SalesAgentSettings, value: boolean) {
    const next = { ...salesSettings, [field]: value };
    void persistSalesSettings(next);
  }

  function handleNumberChange(
    field: "bantThreshold" | "autoTaskThreshold",
    value: string,
  ) {
    const parsed = Number(value);

    if (Number.isNaN(parsed)) {
      return;
    }

    scheduleSalesSave({
      ...salesSettings,
      [field]: Math.min(100, Math.max(0, parsed)),
    });
  }

  function renderToggleRow(
    enabled: boolean,
    onChange: (value: boolean) => void,
    label: string,
    hint?: string,
  ) {
    return (
      <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">{label}</p>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <AutomationOnOffControl
          enabled={enabled}
          disabled={isSaving}
          onChange={onChange}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            aria-label="Back to rules"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
        ) : null}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
            <Icon className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{rule.name}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {rule.triggerSummary} → {rule.actionSummary}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
        <p className="text-sm text-muted-foreground">{rule.description}</p>

        <div className="rounded-lg border p-4">
          <p className="mb-2 text-sm font-medium">
            {AUTOMATIONS_MESSAGES.channelsLabel}
          </p>
          <AutomationsChannelBadgeRow
            channelStatuses={channelStatuses}
            visibleChannelIds={visibleChannelIds}
            size="md"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {AUTOMATIONS_MESSAGES.channelsConnectedHint}
          </p>
        </div>

        {ruleId === "follow_up" ? (
          <>
            {renderToggleRow(followUpEnabled, (value) => {
              setFollowUpEnabled(value);
              void persistFollowUp({ enabled: value });
            }, "Enable follow-up agent", AUTOMATIONS_MESSAGES.followUpChannelsHint)}
            <FollowUpAgentSelect
              agents={agents}
              value={followUpAgentId}
              disabled={isSaving || !followUpEnabled}
              onChange={(agentId) => {
                setFollowUpAgentId(agentId);
                void persistFollowUp({ aiAgentId: agentId });
              }}
            />
            <p className="text-sm text-muted-foreground">
              {AUTOMATIONS_MESSAGES.followUpSentStat(followUpAgent.sentCount)}
            </p>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={DASHBOARD_ROUTES.chats}>
                <ExternalLinkIcon className="size-3.5" />
                {AUTOMATIONS_MESSAGES.viewInboxLink}
              </Link>
            </Button>
          </>
        ) : null}

        {ruleId === "lead_scoring" ? (
          <>
            {renderToggleRow(
              salesSettings.salesAgentEnabled,
              (value) => handleSalesToggle("salesAgentEnabled", value),
              "Enable lead scoring",
            )}
            <div className="space-y-2">
              <Label htmlFor="bant-threshold">
                {AUTOMATIONS_MESSAGES.bantThresholdLabel}
              </Label>
              <Input
                id="bant-threshold"
                type="number"
                min={0}
                max={100}
                value={salesSettings.bantThreshold}
                disabled={!salesSettings.salesAgentEnabled || isSaving}
                onChange={(event) =>
                  handleNumberChange("bantThreshold", event.target.value)
                }
              />
            </div>
            {renderToggleRow(
              salesSettings.sentimentAnalysisEnabled,
              (value) => handleSalesToggle("sentimentAnalysisEnabled", value),
              AUTOMATIONS_MESSAGES.sentimentLabel,
              AUTOMATIONS_MESSAGES.sentimentHint,
            )}
          </>
        ) : null}

        {ruleId === "auto_qualify" ? (
          <>
            {renderToggleRow(
              salesSettings.autoQualifyPipeline,
              (value) => handleSalesToggle("autoQualifyPipeline", value),
              AUTOMATIONS_MESSAGES.autoQualifyLabel,
              AUTOMATIONS_MESSAGES.autoQualifyRequiresScoring,
            )}
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={DASHBOARD_ROUTES.contacts}>
                <ExternalLinkIcon className="size-3.5" />
                {AUTOMATIONS_MESSAGES.viewCrmLink}
              </Link>
            </Button>
          </>
        ) : null}

        {ruleId === "crm_auto_task" ? (
          <>
            {renderToggleRow(
              salesSettings.autoTaskEnabled,
              (value) => handleSalesToggle("autoTaskEnabled", value),
              AUTOMATIONS_MESSAGES.autoTaskEnabled,
              AUTOMATIONS_MESSAGES.crmTaskRequiresScoring,
            )}
            {salesSettings.autoTaskEnabled ? (
              <div className="space-y-2">
                <Label htmlFor="auto-task-threshold">
                  {AUTOMATIONS_MESSAGES.autoTaskThresholdLabel}
                </Label>
                <Input
                  id="auto-task-threshold"
                  type="number"
                  min={0}
                  max={100}
                  value={salesSettings.autoTaskThreshold}
                  disabled={isSaving}
                  onChange={(event) =>
                    handleNumberChange("autoTaskThreshold", event.target.value)
                  }
                />
              </div>
            ) : null}
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={DASHBOARD_ROUTES.contacts}>
                <ExternalLinkIcon className="size-3.5" />
                {AUTOMATIONS_MESSAGES.viewCrmLink}
              </Link>
            </Button>
          </>
        ) : null}

        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          {AUTOMATIONS_MESSAGES.selectRuleHint}{" "}
          <Link
            href={DASHBOARD_ROUTES.aiAgentsSection}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {AUTOMATIONS_MESSAGES.configureAgentsLink}
          </Link>
        </div>
      </div>
    </div>
  );
}
