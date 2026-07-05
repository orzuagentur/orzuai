import "server-only";

import { getActiveMessagingChannelIds } from "@/features/integrations";
import { countActiveRules } from "@/features/automations/rule-catalog";
import { listCustomAutomations } from "@/services/custom-automations.service";
import { getAiUsageSummary } from "@/services/ai-usage.service";
import { requireUser } from "@/services/auth.service";
import {
  getAutomationActivity,
  getAutomationStats,
} from "@/services/automation-activity.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getChannelConnectionStatuses } from "@/services/channel-workspace.service";
import { getFollowUpAgentSettings } from "@/services/follow-up-settings.service";
import { getSalesAgentSettings } from "@/services/sales-agent.service";
import type { AutomationsPageData } from "@/types/automations.types";
import { parseAutomationsSearchParams } from "@/utils/automations-url";

export async function getAutomationsPageData(input?: {
  tab?: string;
  rule?: string;
  workflow?: string;
  step?: string;
}): Promise<AutomationsPageData> {
  const {
    activeTab,
    activeRuleId,
    activeWorkflowId,
    isNewWorkflow,
    createWizardStep,
  } = parseAutomationsSearchParams(input ?? {});
  const user = await requireUser();
  const business = await getPrimaryBusiness(user.id);

  if (!business) {
    return {
      hasBusiness: false,
      activeTab,
      activeRuleId,
      activeWorkflowId: null,
      isNewWorkflow: false,
      createWizardStep: 1,
      usage: null,
      salesAgent: {
        salesAgentEnabled: false,
        bantThreshold: 70,
        autoQualifyPipeline: true,
        autoTaskEnabled: false,
        autoTaskThreshold: 75,
        sentimentAnalysisEnabled: true,
      },
      followUpAgent: { enabled: true, sentCount: 0 },
      stats: {
        followUpsSent: 0,
        qualifiedContacts: 0,
        crmTasksCreated: 0,
        activeRules: 0,
      },
      activity: [],
      workflows: [],
      channelStatuses: {},
      visibleChannelIds: [],
    };
  }

  const [
    usage,
    salesAgent,
    followUpAgent,
    stats,
    activity,
    workflows,
    channelStatuses,
  ] = await Promise.all([
    getAiUsageSummary(),
    getSalesAgentSettings(business.id),
    getFollowUpAgentSettings(business.id),
    getAutomationStats(business.id),
    getAutomationActivity(business.id),
    listCustomAutomations(business.id),
    getChannelConnectionStatuses(business.id),
  ]);

  const visibleChannelIds = getActiveMessagingChannelIds(channelStatuses);
  const builtinActive = countActiveRules(followUpAgent);
  const customActive = workflows.filter((workflow) => workflow.enabled).length;

  return {
    hasBusiness: true,
    activeTab,
    activeRuleId,
    activeWorkflowId,
    isNewWorkflow,
    createWizardStep,
    usage,
    salesAgent,
    followUpAgent,
    stats: { ...stats, activeRules: builtinActive + customActive },
    activity,
    workflows,
    channelStatuses,
    visibleChannelIds,
  };
}
