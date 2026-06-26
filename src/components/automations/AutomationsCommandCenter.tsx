"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { useAutomationsChromeRegistration } from "@/components/automations/automations-chrome-context";
import { AutomationCreateWizard } from "@/components/automations/AutomationCreateWizard";
import { AutomationWorkflowDetailPanel } from "@/components/automations/AutomationWorkflowDetailPanel";
import { AutomationsActivityPanel } from "@/components/automations/AutomationsActivityPanel";
import { AutomationsOverviewPanel } from "@/components/automations/AutomationsOverviewPanel";
import { AutomationsRuleDetailPanel } from "@/components/automations/AutomationsRuleDetailPanel";
import { AutomationsRulesListPanel } from "@/components/automations/AutomationsRulesListPanel";
import { EmptyState } from "@/components/ui/empty-state";
import { enableRecommendedStackAction } from "@/features/automations/actions/set-automation-recipe";
import { AUTOMATIONS_MESSAGES } from "@/features/automations/constants";
import { cn } from "@/lib/utils";
import type { AutomationsPageData } from "@/types/automations.types";
import {
  buildAutomationsHref,
  type AutomationsTab,
} from "@/utils/automations-url";

type AutomationsCommandCenterProps = {
  data: AutomationsPageData;
};

export function AutomationsCommandCenter({ data }: AutomationsCommandCenterProps) {
  const router = useRouter();
  const [isEnablingRecommended, setIsEnablingRecommended] = useState(false);

  const activeWorkflow = data.activeWorkflowId
    ? data.workflows.find((workflow) => workflow.id === data.activeWorkflowId)
    : null;

  const showRulesDetailOnMobile =
    data.activeTab === "rules" &&
    (Boolean(data.activeRuleId) || Boolean(data.activeWorkflowId));

  const handleTabChange = useCallback(
    (tab: AutomationsTab) => {
      router.push(
        buildAutomationsHref({
          tab,
          rule: tab === "rules" ? data.activeRuleId : null,
          workflow:
            tab === "rules"
              ? data.isNewWorkflow
                ? "new"
                : data.activeWorkflowId
              : null,
          step: tab === "rules" && data.isNewWorkflow ? data.createWizardStep : null,
        }),
      );
    },
    [
      data.activeRuleId,
      data.activeWorkflowId,
      data.createWizardStep,
      data.isNewWorkflow,
      router,
    ],
  );

  const handleEnableRecommended = useCallback(async () => {
    setIsEnablingRecommended(true);

    try {
      const result = await enableRecommendedStackAction();

      if (!result.success) {
        toast.error(result.message ?? AUTOMATIONS_MESSAGES.stackEnableFailed);
        return;
      }

      toast.success(AUTOMATIONS_MESSAGES.stackEnabled);
      router.refresh();
    } finally {
      setIsEnablingRecommended(false);
    }
  }, [router]);

  const handleEnableRecommendedClick = useCallback(() => {
    void handleEnableRecommended();
  }, [handleEnableRecommended]);

  useAutomationsChromeRegistration({
    activeTab: data.activeTab,
    onTabChange: handleTabChange,
    onEnableRecommended: handleEnableRecommendedClick,
    isEnablingRecommended,
  });

  function clearRulesSelection() {
    router.push(buildAutomationsHref({ tab: "rules" }));
  }

  function handleWizardStepChange(step: 1 | 2 | 3) {
    router.push(
      buildAutomationsHref({
        tab: "rules",
        workflow: "new",
        step,
      }),
    );
  }

  function handleWizardCancel() {
    router.push(buildAutomationsHref({ tab: "rules" }));
  }

  if (data.isNewWorkflow) {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
        <AutomationCreateWizard
          step={data.createWizardStep}
          channelStatuses={data.channelStatuses}
          visibleChannelIds={data.visibleChannelIds}
          onStepChange={handleWizardStepChange}
          onCancel={handleWizardCancel}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      {data.activeTab === "overview" ? (
        <AutomationsOverviewPanel
          stats={data.stats}
          salesAgent={data.salesAgent}
          followUpAgent={data.followUpAgent}
          channelStatuses={data.channelStatuses}
          visibleChannelIds={data.visibleChannelIds}
        />
      ) : null}

      {data.activeTab === "activity" ? (
        <AutomationsActivityPanel activity={data.activity} />
      ) : null}

      {data.activeTab === "rules" ? (
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            className={cn(
              "grid h-full min-h-0 min-w-0 overflow-hidden",
              "lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]",
            )}
          >
            <aside
              className={cn(
                "flex min-h-0 min-w-0 flex-col overflow-hidden border-r",
                showRulesDetailOnMobile && "hidden lg:flex",
              )}
            >
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <AutomationsRulesListPanel
                  activeRuleId={data.activeRuleId}
                  activeWorkflowId={data.activeWorkflowId}
                  activeTab={data.activeTab}
                  salesAgent={data.salesAgent}
                  followUpAgent={data.followUpAgent}
                  workflows={data.workflows}
                  channelStatuses={data.channelStatuses}
                  visibleChannelIds={data.visibleChannelIds}
                />
              </div>
            </aside>

            <main
              className={cn(
                "flex min-h-0 min-w-0 flex-col overflow-hidden",
                showRulesDetailOnMobile ? "flex" : "hidden lg:flex",
              )}
            >
              {data.activeRuleId ? (
                <AutomationsRuleDetailPanel
                  ruleId={data.activeRuleId}
                  salesAgent={data.salesAgent}
                  followUpAgent={data.followUpAgent}
                  channelStatuses={data.channelStatuses}
                  visibleChannelIds={data.visibleChannelIds}
                  onBack={
                    showRulesDetailOnMobile ? clearRulesSelection : undefined
                  }
                />
              ) : activeWorkflow ? (
                <AutomationWorkflowDetailPanel
                  workflow={activeWorkflow}
                  channelStatuses={data.channelStatuses}
                  visibleChannelIds={data.visibleChannelIds}
                  onBack={
                    showRulesDetailOnMobile ? clearRulesSelection : undefined
                  }
                />
              ) : (
                <EmptyState
                  variant="generic"
                  title={AUTOMATIONS_MESSAGES.emptyRulesTitle}
                  description={AUTOMATIONS_MESSAGES.emptyRulesDescription}
                  actionLabel={AUTOMATIONS_MESSAGES.newWorkflow}
                  actionHref={buildAutomationsHref({
                    tab: "rules",
                    workflow: "new",
                  })}
                  className="flex-1"
                />
              )}
            </main>
          </div>
        </div>
      ) : null}
    </div>
  );
}
