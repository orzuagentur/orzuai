"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ActivityIcon,
  BookOpenIcon,
  BotIcon,
  CheckCircle2Icon,
  Loader2Icon,
  MessageSquareTextIcon,
  PowerIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AiAssistantEditPanel } from "@/components/ai-assistant/AiAssistantEditPanel";
import { AiAssistantHubPanel } from "@/components/ai-assistant/AiAssistantHubPanel";
import { WebsiteKnowledgeSection } from "@/components/knowledge-base/WebsiteKnowledgeSection";
import { KnowledgeBasePanel } from "@/components/knowledge-base/KnowledgeBasePanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { activateAiAgentAction } from "@/features/ai-assistant/actions/activate-ai-agent";
import { testSingleAiAgentAction } from "@/features/ai-assistant/actions/test-single-ai-agent";
import type { AiAssistantPageData } from "@/types/channel-workspace.types";

type AiAssistantSectionProps = {
  data: AiAssistantPageData;
};

type AiAgentTab = "dashboard" | "channels" | "knowledge" | "settings" | "test";

const TEST_PROMPTS = [
  "Клиент хочет записаться завтра в 15:00. Что ты ответишь и что сохранишь?",
  "Создай задачу: перезвонить клиенту завтра утром по поводу цены.",
  "Клиент спрашивает цену и условия доставки. Ответь по базе знаний.",
  "Клиент просит владельца подключиться к разговору.",
  "Клиент оставил email и хочет коммерческое предложение.",
  "Клиент хочет перенести встречу на пятницу после обеда.",
];

const TAB_ITEMS: Array<{
  id: AiAgentTab;
  label: string;
  icon: typeof BotIcon;
}> = [
  { id: "dashboard", label: "Agent Dashboard", icon: ActivityIcon },
  { id: "channels", label: "Channels", icon: SlidersHorizontalIcon },
  { id: "knowledge", label: "Knowledge Base", icon: BookOpenIcon },
  { id: "settings", label: "Agent Settings", icon: Settings2Icon },
  { id: "test", label: "Test Agent", icon: MessageSquareTextIcon },
];

function permissionSummary(data: AiAssistantPageData): Array<[string, boolean]> {
  const profile = data.assistantProfile;

  if (!profile) {
    return [];
  }

  return [
    ["Reply", profile.canReply],
    ["Tasks", profile.canCreateTask],
    ["Deals", profile.canCreateDeal],
    ["Contact updates", profile.canUpdateContact],
    ["Calendar", profile.canCreateCalendarEvent],
    ["Human handoff", profile.canRequestHuman],
    ["Owner notifications", profile.canNotifyOwner],
  ];
}

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

function AgentDashboard({ data }: { data: AiAssistantPageData }) {
  const permissions = permissionSummary(data);
  const activePermissions = permissions.filter(([, enabled]) => enabled).length;
  const recentRuns = data.recentAgentRuns;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Channels active</CardDescription>
            <CardTitle>{data.enabledChannelCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {data.connectedChannelCount} connected channel(s)
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Permissions</CardDescription>
            <CardTitle>{activePermissions}/{permissions.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Controls what AI may do autonomously
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Knowledge</CardDescription>
            <CardTitle>{data.knowledgeEntries.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Manual/website entries available to the agent
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Website sync</CardDescription>
            <CardTitle>
              {data.websiteKnowledgeSync?.syncStatus ?? "Off"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {data.websiteKnowledgeSync?.entriesSynced ?? 0} synced entries
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Enabled channels</CardTitle>
            <CardDescription>
              Where the AI Agent can currently answer customers.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {data.channels.map(({ channel, settings }) => (
              <div key={channel} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium capitalize">
                    {channel.replace(/_/g, " ")}
                  </p>
                  <span className="text-sm font-medium">
                    {settings.aiEnabled ? "On" : "Off"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {settings.isChannelConnected ? "Connected" : "Not connected"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>Autonomous actions currently allowed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {permissions.map(([label, enabled]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span>{label}</span>
                <span className={enabled ? "text-primary" : "text-muted-foreground"}>
                  {enabled ? "Allowed" : "Blocked"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Latest activity</CardTitle>
          <CardDescription>
            Recent CRM actions, handoff decisions, and agent runs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentRuns.length > 0 ? (
            recentRuns.map((run) => (
              <div key={run.id} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {run.success ? "Completed" : "Failed"} · {run.channel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(run.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {run.messagePreview}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No autonomous activity yet. It will appear after customer messages.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KnowledgeTab({ data }: { data: AiAssistantPageData }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <WebsiteKnowledgeSection
        sync={data.websiteKnowledgeSync}
        hasBusiness={data.hasBusiness}
        geminiConfigured={data.geminiConfigured}
      />
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Agent Knowledge Base</CardTitle>
          <CardDescription>
            Add services, pricing, policies, FAQs, and website knowledge. The
            AI Agent uses this before answering customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KnowledgeBasePanel
            entries={data.knowledgeEntries}
            hasActiveFilters={data.knowledgeHasActiveFilters}
            hasBusiness={data.hasBusiness}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function TestAgentTab() {
  const [message, setMessage] = useState(TEST_PROMPTS[0] ?? "");
  const [reply, setReply] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  async function runTest() {
    setIsTesting(true);
    setReply("");

    try {
      const result = await testSingleAiAgentAction({ message });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setReply(result.reply);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 p-4 md:grid-cols-[320px_1fr] md:p-6">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Ready prompts</CardTitle>
          <CardDescription>Test real tasks before going live.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {TEST_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="w-full rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted"
              onClick={() => setMessage(prompt)}
            >
              {prompt}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Test Agent Chat</CardTitle>
          <CardDescription>
            This does not send anything to customers. It only tests the agent
            brain, permissions, and knowledge.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-h-32"
            placeholder="Ask the agent to answer, create a task, schedule something, or call the owner..."
          />
          <Button type="button" disabled={isTesting} onClick={() => void runTest()}>
            {isTesting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Agent is thinking...
              </>
            ) : (
              "Run test"
            )}
          </Button>
          <div className="min-h-40 rounded-xl border bg-muted/20 p-4">
            {reply ? (
              <p className="whitespace-pre-wrap text-sm leading-6">{reply}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                The test reply will appear here.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AiAssistantSection({ data }: AiAssistantSectionProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AiAgentTab>("dashboard");
  const [activated, setActivated] = useState(data.enabledChannelCount > 0);
  const shouldShowActivation = !activated && data.enabledChannelCount === 0;

  const tabs = useMemo(() => TAB_ITEMS, []);

  if (shouldShowActivation) {
    return (
      <div className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
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
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      <div className="border-b px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Button
                key={tab.id}
                type="button"
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="size-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === "dashboard" ? <AgentDashboard data={data} /> : null}
        {activeTab === "channels" ? (
          <AiAssistantHubPanel
            channels={data.channels}
            enabledChannelCount={data.enabledChannelCount}
            onEdit={() => setActiveTab("settings")}
          />
        ) : null}
        {activeTab === "knowledge" ? <KnowledgeTab data={data} /> : null}
        {activeTab === "settings" && data.assistantProfile ? (
          <AiAssistantEditPanel
            profile={data.assistantProfile}
            onBack={() => setActiveTab("dashboard")}
          />
        ) : null}
        {activeTab === "test" ? <TestAgentTab /> : null}
      </div>
    </div>
  );
}
