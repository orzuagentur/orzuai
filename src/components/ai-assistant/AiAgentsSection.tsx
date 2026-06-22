"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AiAgentAnalyticsPanel } from "@/components/ai-assistant/AiAgentAnalyticsPanel";
import { AiAgentCreateWizard } from "@/components/ai-assistant/AiAgentCreateWizard";
import { AiAgentEditPanel } from "@/components/ai-assistant/AiAgentEditPanel";
import { AiAgentViewPanel } from "@/components/ai-assistant/AiAgentViewPanel";
import { AiAgentListPanel } from "@/components/ai-assistant/AiAgentListPanel";
import { AiAssistantChannelTabs } from "@/components/ai-assistant/AiAssistantChannelTabs";
import { useAiAssistantChromeRegistration } from "@/components/ai-assistant/ai-assistant-chrome-context";
import { Button } from "@/components/ui/button";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import type { AgentWizardGoalId, AgentWizardStepId } from "@/features/ai-assistant/agent-wizard-catalog";
import { cn } from "@/lib/utils";
import type { AiAssistantPageData } from "@/types/channel-workspace.types";
import { buildAiAssistantHref } from "@/utils/ai-assistant-url";

type AiAgentsSectionProps = {
  data: AiAssistantPageData;
};

function buildAgentsHref(
  data: AiAssistantPageData,
  overrides: Parameters<typeof buildAiAssistantHref>[0] = {},
) {
  return buildAiAssistantHref({
    section: "agents",
    channel: data.activeChannelFilter,
    agent: data.isNewAgent ? "new" : data.activeAgentId,
    step: data.isNewAgent ? data.createWizardStep : null,
    goal: data.createWizardGoal,
    q: data.searchQuery || null,
    setup: data.showSetupBanner,
    edit: data.isEditingAgent,
    ...overrides,
  });
}

export function AiAgentsSection({ data }: AiAgentsSectionProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(data.searchQuery);
  const showEditorOnMobile = Boolean(
    data.activeAgentId || data.isNewAgent,
  );

  const activeAgent = useMemo(
    () => data.agents.find((agent) => agent.id === data.activeAgentId) ?? null,
    [data.activeAgentId, data.agents],
  );

  const agentEnabledByChannel = useMemo(() => {
    const map: Partial<Record<(typeof data.channels)[number]["channel"], boolean>> =
      {};

    for (const agent of data.agents) {
      if (!agent.enabled) {
        continue;
      }

      for (const channel of agent.channels) {
        map[channel] = true;
      }
    }

    return map;
  }, [data.agents]);

  const activeChannelEntry = data.channels.find(
    (entry) => entry.channel === data.activeChannel,
  );

  useEffect(() => {
    setSearchValue(data.searchQuery);
  }, [data.searchQuery]);

  useEffect(() => {
    const trimmed = searchValue.trim();

    if (trimmed === data.searchQuery) {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.replace(
        buildAgentsHref(data, {
          q: trimmed || null,
          agent: data.isNewAgent ? "new" : data.activeAgentId,
        }),
      );
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [data, router, searchValue]);

  const handleNewAgent = useCallback(() => {
    router.push(
      buildAgentsHref(data, {
        agent: "new",
        step: 1,
        goal: null,
        setup: false,
      }),
    );
  }, [data, router]);

  const handleCancelCreate = useCallback(() => {
    router.push(
      buildAgentsHref(data, {
        agent: null,
        step: null,
        goal: null,
        setup: false,
      }),
    );
  }, [data, router]);

  const handleWizardStepChange = useCallback(
    (step: AgentWizardStepId, goal?: AgentWizardGoalId | null) => {
      router.push(
        buildAgentsHref(data, {
          agent: "new",
          step,
          goal: goal ?? data.createWizardGoal,
          setup: false,
        }),
      );
    },
    [data, router],
  );

  const handleDismissSetupBanner = useCallback(() => {
    router.replace(
      buildAgentsHref(data, {
        agent: data.activeAgentId,
        setup: false,
        edit: false,
      }),
    );
  }, [data, router]);

  const handleEditAgent = useCallback(() => {
    router.push(
      buildAgentsHref(data, {
        agent: data.activeAgentId,
        edit: true,
        analytics: false,
        setup: false,
      }),
    );
  }, [data, router]);

  const handleOpenAnalytics = useCallback(() => {
    router.push(
      buildAgentsHref(data, {
        agent: data.activeAgentId,
        edit: false,
        analytics: true,
        setup: false,
      }),
    );
  }, [data, router]);

  const handleCloseAnalytics = useCallback(() => {
    router.push(
      buildAgentsHref(data, {
        agent: data.activeAgentId,
        edit: false,
        analytics: false,
        setup: false,
      }),
    );
  }, [data, router]);

  const handleCancelEdit = useCallback(() => {
    router.push(
      buildAgentsHref(data, {
        agent: data.activeAgentId,
        edit: false,
        analytics: false,
        setup: false,
      }),
    );
  }, [data, router]);

  useAiAssistantChromeRegistration({
    searchQuery: searchValue,
    onSearchChange: setSearchValue,
    onNewAgent: handleNewAgent,
    showSearch: !data.isNewAgent,
    showNewAgent: !data.isNewAgent,
  });

  function clearAgentSelection() {
    router.push(
      buildAgentsHref(data, {
        agent: null,
        setup: false,
      }),
    );
  }

  if (data.isNewAgent) {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
        <AiAgentCreateWizard
          step={data.createWizardStep}
          goal={(data.createWizardGoal as AgentWizardGoalId | null) ?? null}
          activeChannel={data.activeChannel}
          activeChannelFilter={data.activeChannelFilter}
          searchQuery={data.searchQuery}
          visibleChannelIds={data.visibleChannelIds}
          channelStatuses={data.channelStatuses}
          channelDefaults={
            activeChannelEntry?.settings ?? data.channels[0]!.settings
          }
          providerAvailability={data.providerAvailability}
          platformProviderAvailability={data.platformProviderAvailability}
          businessProviderCredentials={data.businessProviderCredentials}
          preferCustomerAiKeys={data.preferCustomerAiKeys}
          allAgents={data.agents}
          onStepChange={handleWizardStepChange}
          onCancel={handleCancelCreate}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      <AiAssistantChannelTabs
        activeChannel={data.activeChannelFilter}
        activeAgentId={data.activeAgentId}
        searchQuery={data.searchQuery}
        visibleChannelIds={data.visibleChannelIds}
        agentEnabledByChannel={agentEnabledByChannel}
      />

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
              showEditorOnMobile && "hidden lg:flex",
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <AiAgentListPanel
                agents={data.agents}
                activeChannelFilter={data.activeChannelFilter}
                activeAgentId={data.activeAgentId}
                isNewAgent={data.isNewAgent}
                searchQuery={data.searchQuery}
              />
            </div>
          </aside>

          <main
            className={cn(
              "flex min-h-0 min-w-0 flex-col overflow-hidden",
              showEditorOnMobile ? "flex" : "hidden lg:flex",
            )}
          >
            {activeAgent && data.isViewingAnalytics ? (
              <AiAgentAnalyticsPanel
                agent={activeAgent}
                onClose={handleCloseAnalytics}
                onBack={showEditorOnMobile ? clearAgentSelection : undefined}
              />
            ) : activeAgent && data.isEditingAgent ? (
              <AiAgentEditPanel
                agent={activeAgent}
                activeChannel={data.activeChannel}
                activeChannelFilter={data.activeChannelFilter}
                searchQuery={data.searchQuery}
                allAgents={data.agents}
                visibleChannelIds={data.visibleChannelIds}
                channelStatuses={data.channelStatuses}
                providerAvailability={data.providerAvailability}
                platformProviderAvailability={data.platformProviderAvailability}
                businessProviderCredentials={data.businessProviderCredentials}
                onCancel={handleCancelEdit}
                onBack={showEditorOnMobile ? clearAgentSelection : undefined}
              />
            ) : activeAgent ? (
              <AiAgentViewPanel
                agent={activeAgent}
                activeChannelFilter={data.activeChannelFilter}
                searchQuery={data.searchQuery}
                visibleChannelIds={data.visibleChannelIds}
                channelStatuses={data.channelStatuses}
                showSetupBanner={data.showSetupBanner}
                onEdit={handleEditAgent}
                onOpenAnalytics={handleOpenAnalytics}
                onDismissSetupBanner={handleDismissSetupBanner}
                onBack={showEditorOnMobile ? clearAgentSelection : undefined}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {AI_ASSISTANT_MESSAGES.selectAgent}
                  </p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {AI_ASSISTANT_MESSAGES.wizardSubtitle}
                  </p>
                </div>
                <Button type="button" onClick={handleNewAgent}>
                  {AI_ASSISTANT_MESSAGES.newAgent}
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
