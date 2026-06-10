"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AiAgentEditPanel } from "@/components/ai-assistant/AiAgentEditPanel";
import { AiAgentMarketplace } from "@/components/ai-assistant/AiAgentMarketplace";
import { AiAgentSetupPanel } from "@/components/ai-assistant/AiAgentSetupPanel";
import { AiAgentViewPanel } from "@/components/ai-assistant/AiAgentViewPanel";
import { AiAgentListPanel } from "@/components/ai-assistant/AiAgentListPanel";
import { AiAssistantChannelTabs } from "@/components/ai-assistant/AiAssistantChannelTabs";
import { AiAssistantSectionTabs } from "@/components/ai-assistant/AiAssistantSectionTabs";
import { AiAutomationPanel } from "@/components/ai-assistant/AiAutomationPanel";
import { useAiAssistantChromeRegistration } from "@/components/ai-assistant/ai-assistant-chrome-context";
import { Button } from "@/components/ui/button";
import { ChannelAiPanel } from "@/components/channel-workspace/ChannelAiPanel";
import { AI_ASSISTANT_MESSAGES } from "@/features/ai-assistant/constants";
import { cn } from "@/lib/utils";
import type { AiAssistantPageData } from "@/types/channel-workspace.types";
import {
  buildAiAssistantHref,
  type AiAssistantTab,
} from "@/utils/ai-assistant-url";

type AiAgentsHubProps = {
  data: AiAssistantPageData;
};

function buildHubHref(
  data: AiAssistantPageData,
  overrides: Parameters<typeof buildAiAssistantHref>[0] = {},
) {
  return buildAiAssistantHref({
    channel: data.activeChannelFilter,
    tab: data.activeTab,
    agent: data.isNewAgent ? "new" : data.activeAgentId,
    pick: data.activeAgentPick,
    q: data.searchQuery || null,
    setup: data.showSetupBanner,
    edit: data.isEditingAgent,
    ...overrides,
  });
}

export function AiAgentsHub({ data }: AiAgentsHubProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(data.searchQuery);
  const showEditorOnMobile = Boolean(
    data.activeAgentId || data.isNewAgent,
  );

  const activeAgent = useMemo(
    () => data.agents.find((agent) => agent.id === data.activeAgentId) ?? null,
    [data.activeAgentId, data.agents],
  );

  const aiEnabledByChannel = useMemo(
    () =>
      Object.fromEntries(
        data.channels.map((entry) => [entry.channel, entry.settings.aiEnabled]),
      ),
    [data.channels],
  );

  const activeChannelEntry = data.channels.find(
    (entry) => entry.channel === data.activeChannel,
  );

  useEffect(() => {
    setSearchValue(data.searchQuery);
  }, [data.searchQuery]);

  useEffect(() => {
    const trimmed = searchValue.trim();

    if (trimmed === data.searchQuery || data.activeTab !== "agents") {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.replace(
        buildHubHref(data, {
          q: trimmed || null,
          agent: data.isNewAgent ? "new" : data.activeAgentId,
        }),
      );
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [data, router, searchValue]);

  const handleTabChange = useCallback(
    (tab: AiAssistantTab) => {
      router.push(
        buildHubHref(data, {
          tab,
          agent: tab === "agents" ? data.activeAgentId : null,
          q: tab === "agents" ? data.searchQuery || null : null,
          setup: false,
        }),
      );
    },
    [data, router],
  );

  const handleNewAgent = useCallback(() => {
    router.push(
      buildHubHref(data, {
        tab: "agents",
        agent: "new",
        pick: null,
        setup: false,
      }),
    );
  }, [data, router]);

  const handleCancelCreate = useCallback(() => {
    router.push(
      buildHubHref(data, {
        agent: null,
        pick: null,
        setup: false,
      }),
    );
  }, [data, router]);

  const handleBackToMarketplace = useCallback(() => {
    router.push(
      buildHubHref(data, {
        agent: "new",
        pick: null,
        setup: false,
      }),
    );
  }, [data, router]);

  const handleDismissSetupBanner = useCallback(() => {
    router.replace(
      buildHubHref(data, {
        agent: data.activeAgentId,
        setup: false,
        edit: false,
      }),
    );
  }, [data, router]);

  const handleEditAgent = useCallback(() => {
    router.push(
      buildHubHref(data, {
        agent: data.activeAgentId,
        edit: true,
        setup: false,
      }),
    );
  }, [data, router]);

  const handleCancelEdit = useCallback(() => {
    router.push(
      buildHubHref(data, {
        agent: data.activeAgentId,
        edit: false,
        setup: false,
      }),
    );
  }, [data, router]);

  useAiAssistantChromeRegistration({
    searchQuery: searchValue,
    onSearchChange: setSearchValue,
    activeTab: data.activeTab,
    onTabChange: handleTabChange,
    onNewAgent: handleNewAgent,
    showSearch: data.activeTab === "agents" && !data.isNewAgent,
    showNewAgent: data.activeTab === "agents" && !data.isNewAgent,
  });

  function clearAgentSelection() {
    router.push(
      buildHubHref(data, {
        agent: null,
        setup: false,
      }),
    );
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      <AiAssistantChannelTabs
        activeChannel={data.activeChannelFilter}
        activeTab={data.activeTab}
        activeAgentId={data.activeAgentId}
        searchQuery={data.searchQuery}
        visibleChannelIds={data.visibleChannelIds}
        aiEnabledByChannel={aiEnabledByChannel}
      />

      <AiAssistantSectionTabs
        activeTab={data.activeTab}
        activeChannel={data.activeChannelFilter}
        activeAgentId={data.activeAgentId}
        searchQuery={data.searchQuery}
      />

      {data.activeTab === "agents" ? (
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
                (showEditorOnMobile || data.isNewAgent) && "hidden lg:flex",
              )}
            >
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <AiAgentListPanel
                  agents={data.agents}
                  activeChannelFilter={data.activeChannelFilter}
                  activeAgentId={data.activeAgentId}
                  isNewAgent={data.isNewAgent}
                  searchQuery={data.searchQuery}
                  activeTab="agents"
                />
              </div>
            </aside>

            <main
              className={cn(
                "flex min-h-0 min-w-0 flex-col overflow-hidden",
                showEditorOnMobile ? "flex" : "hidden lg:flex",
              )}
            >
              {data.isNewAgent && data.activeAgentPick ? (
                <AiAgentSetupPanel
                  templateId={data.activeAgentPick}
                  activeChannel={data.activeChannel}
                  activeChannelFilter={data.activeChannelFilter}
                  searchQuery={data.searchQuery}
                  visibleChannelIds={data.visibleChannelIds}
                  channelDefaults={
                    activeChannelEntry?.settings ?? data.channels[0]!.settings
                  }
                  providerAvailability={data.providerAvailability}
                  onBack={handleBackToMarketplace}
                  onCancel={handleCancelCreate}
                />
              ) : data.isNewAgent ? (
                <AiAgentMarketplace
                  activeChannelFilter={data.activeChannelFilter}
                  searchQuery={data.searchQuery}
                  onCancel={handleCancelCreate}
                />
              ) : activeAgent && data.isEditingAgent ? (
                <AiAgentEditPanel
                  agent={activeAgent}
                  activeChannel={data.activeChannel}
                  activeChannelFilter={data.activeChannelFilter}
                  searchQuery={data.searchQuery}
                  allAgents={data.agents}
                  providerAvailability={data.providerAvailability}
                  onCancel={handleCancelEdit}
                  onBack={
                    showEditorOnMobile ? clearAgentSelection : undefined
                  }
                />
              ) : activeAgent ? (
                <AiAgentViewPanel
                  agent={activeAgent}
                  activeChannelFilter={data.activeChannelFilter}
                  searchQuery={data.searchQuery}
                  showSetupBanner={data.showSetupBanner}
                  onEdit={handleEditAgent}
                  onDismissSetupBanner={handleDismissSetupBanner}
                  onBack={
                    showEditorOnMobile ? clearAgentSelection : undefined
                  }
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {AI_ASSISTANT_MESSAGES.selectAgent}
                    </p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      {AI_ASSISTANT_MESSAGES.marketplaceDescription}
                    </p>
                  </div>
                  <Button type="button" onClick={handleNewAgent}>
                    {AI_ASSISTANT_MESSAGES.marketplaceTitle}
                  </Button>
                </div>
              )}
            </main>
          </div>
        </div>
      ) : null}

      {data.activeTab === "automation" ? (
        <AiAutomationPanel
          usage={data.usage}
          salesAgent={data.salesAgent}
          followUpAgent={data.followUpAgent}
        />
      ) : null}

      {data.activeTab === "channels" ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          <p className="mb-6 text-sm text-muted-foreground">
            {AI_ASSISTANT_MESSAGES.channelsIntro}
          </p>
          {activeChannelEntry ? (
            <ChannelAiPanel data={activeChannelEntry.settings} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {AI_ASSISTANT_MESSAGES.channelNotConnected}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
