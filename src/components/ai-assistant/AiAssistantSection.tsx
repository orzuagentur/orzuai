"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BotIcon,
  CheckCircle2Icon,
  Loader2Icon,
  PowerIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  AgentDashboardPanel,
  AgentSectionBackButton,
} from "@/components/ai-assistant/AgentDashboardPanel";
import { useAiAssistantChromeRegistration } from "@/components/ai-assistant/ai-assistant-chrome-context";
import { AiAssistantEditPanel } from "@/components/ai-assistant/AiAssistantEditPanel";
import { AiAssistantHubPanel } from "@/components/ai-assistant/AiAssistantHubPanel";
import { KnowledgeHubPanel } from "@/components/knowledge-base/KnowledgeHubPanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { activateAiAgentAction } from "@/features/ai-assistant/actions/activate-ai-agent";
import type { AiAgentTab } from "@/types/agent-dashboard.types";
import type { AiAssistantPageData } from "@/types/channel-workspace.types";

type AiAssistantSectionProps = {
  data: AiAssistantPageData;
};

function ActivationGate({ onActivated }: { onActivated: () => void }) {
  const [isActivating, setIsActivating] = useState(false);
  const [stage, setStage] = useState(0);

  async function activate() {
    setIsActivating(true);
    setStage(1);

    window.setTimeout(() => setStage(2), 450);
    window.setTimeout(() => setStage(3), 900);

    const result = await activateAiAgentAction();

    setIsActivating(false);

    if (!result.success) {
      toast.error(result.message ?? "Unable to activate AI Agent.");
      setStage(0);
      return;
    }

    toast.success(
      result.enabledChannels > 0
        ? `AI Agent activated on ${result.enabledChannels} channel(s).`
        : "AI Agent activated. Connect channels to start replying.",
    );
    onActivated();
  }

  const steps = [
    "Preparing profile",
    "Connecting channel controls",
    "Loading permissions",
  ];

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4 md:p-8">
      <Card className="w-full max-w-2xl overflow-hidden shadow-none">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BotIcon className="size-7" />
          </div>
          <div>
            <CardTitle className="text-2xl">Activate your AI Agent</CardTitle>
            <CardDescription className="mt-2 text-base">
              One agent will answer customers, update CRM, create tasks/deals,
              book calendar events, and call the owner when allowed.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {steps.map((item, index) => {
              const active = stage > index;
              return (
                <div
                  key={item}
                  className="rounded-xl border bg-muted/20 p-4 text-center"
                >
                  <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-full bg-background">
                    {active ? (
                      <CheckCircle2Icon className="size-4 text-primary" />
                    ) : (
                      <SparklesIcon className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm font-medium">{item}</p>
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={isActivating}
            onClick={() => void activate()}
          >
            {isActivating ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Creating AI Agent...
              </>
            ) : (
              <>
                <PowerIcon className="size-4" />
                Activate AI Agent
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function KnowledgeTab({
  data,
  onBack,
}: {
  data: AiAssistantPageData;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AgentSectionBackButton onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
          <KnowledgeHubPanel
            categories={data.knowledgeCategories}
            hasBusiness={data.hasBusiness}
            geminiConfigured={data.geminiConfigured}
            websiteKnowledgeSync={data.websiteKnowledgeSync}
          />
        </div>
      </div>
    </div>
  );
}

function resolveKnowledgeTabFromParams(searchParams: URLSearchParams): boolean {
  if (searchParams.get("tab") === "knowledge") {
    return true;
  }

  return Boolean(searchParams.get("q") || searchParams.get("category"));
}

export function AiAssistantSection({ data }: AiAssistantSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AiAgentTab>(() =>
    resolveKnowledgeTabFromParams(searchParams) ? "knowledge" : "dashboard",
  );
  const isAgentActive = data.assistantProfile?.canReply ?? false;
  const [activated, setActivated] = useState(
    isAgentActive || data.enabledChannelCount > 0,
  );
  const shouldShowActivation = !activated && !isAgentActive;

  const handleTabChange = useCallback((tab: AiAgentTab) => {
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    if (resolveKnowledgeTabFromParams(searchParams)) {
      setActiveTab("knowledge");
    }
  }, [searchParams]);

  useAiAssistantChromeRegistration(
    shouldShowActivation
      ? null
      : {
          activeTab,
          onTabChange: handleTabChange,
          showTabs: true,
        },
  );

  if (shouldShowActivation) {
    return (
      <div className="flex dashboard-main-frame min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
        <ActivationGate
          onActivated={() => {
            setActivated(true);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex dashboard-main-frame min-h-0 w-full min-w-0 flex-col overflow-x-hidden overflow-hidden bg-background">
      {activeTab === "dashboard" ? (
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <AgentDashboardPanel
            data={data}
            stats={data.agentDashboardStats}
            agentRuns={data.agentRuns}
            recentDialogues={data.recentDialogues}
            aiActivity={data.aiActivity}
            onNavigate={setActiveTab}
          />
        </div>
      ) : null}

      {activeTab === "channels" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <AgentSectionBackButton onBack={() => setActiveTab("dashboard")} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AiAssistantHubPanel
              channels={data.channels}
              enabledChannelCount={data.enabledChannelCount}
            />
          </div>
        </div>
      ) : null}

      {activeTab === "knowledge" ? (
        <KnowledgeTab data={data} onBack={() => setActiveTab("dashboard")} />
      ) : null}

      {activeTab === "settings" && data.assistantProfile ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <AiAssistantEditPanel
            profile={data.assistantProfile}
            followUpAgent={data.followUpAgent}
            workerReadiness={data.workerReadiness}
            salesAgent={data.salesAgent}
            onBack={() => setActiveTab("dashboard")}
          />
        </div>
      ) : null}
    </div>
  );
}
