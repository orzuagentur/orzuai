"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";

import { AutomationsChannelBadgeRow } from "@/components/automations/AutomationsChannelBadgeRow";
import { AutomationOnOffControl } from "@/components/automations/AutomationOnOffControl";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { saveFollowUpAgentSettingsAction } from "@/features/ai-assistant/actions/save-follow-up-agent-settings";
import {
  getAutomationRule,
  type AutomationRuleId,
} from "@/features/automations/rule-catalog";
import { AUTOMATIONS_MESSAGES } from "@/features/automations/constants";
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import type { FollowUpAgentSettings } from "@/services/follow-up-settings.service";

type AutomationsRuleDetailPanelProps = {
  ruleId: AutomationRuleId;
  followUpAgent: FollowUpAgentSettings;
  channelStatuses: IntegrationChannelStatusMap;
  visibleChannelIds: MessagingIntegrationChannelId[];
  onBack?: () => void;
};

export function AutomationsRuleDetailPanel({
  ruleId,
  followUpAgent,
  channelStatuses,
  visibleChannelIds,
  onBack,
}: AutomationsRuleDetailPanelProps) {
  const router = useRouter();
  const rule = getAutomationRule(ruleId);
  const Icon = rule.icon;

  const [followUpEnabled, setFollowUpEnabled] = useState(followUpAgent.enabled);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFollowUpEnabled(followUpAgent.enabled);
  }, [followUpAgent]);

  async function persistFollowUp(enabled: boolean) {
    setIsSaving(true);

    try {
      const result = await saveFollowUpAgentSettingsAction({ enabled });

      if (!result.success) {
        toast.error(result.message ?? AUTOMATIONS_MESSAGES.ruleSaveFailed);
        setFollowUpEnabled(followUpAgent.enabled);
        return;
      }

      toast.success(AUTOMATIONS_MESSAGES.ruleSaved);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
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
              {rule.triggerSummary} -&gt; {rule.actionSummary}
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

        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Enable follow-up agent</p>
            <p className="text-xs text-muted-foreground">
              {AUTOMATIONS_MESSAGES.followUpChannelsHint}
            </p>
          </div>
          <AutomationOnOffControl
            enabled={followUpEnabled}
            disabled={isSaving}
            onChange={(value) => {
              setFollowUpEnabled(value);
              void persistFollowUp(value);
            }}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Follow-ups use the same AI Agent profile and permissions.
        </p>
        <p className="text-sm text-muted-foreground">
          {AUTOMATIONS_MESSAGES.followUpSentStat(followUpAgent.sentCount)}
        </p>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href={DASHBOARD_ROUTES.chats}>
            <ExternalLinkIcon className="size-3.5" />
            {AUTOMATIONS_MESSAGES.viewInboxLink}
          </Link>
        </Button>

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
