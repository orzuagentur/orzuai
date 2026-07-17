"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  BotIcon,
  Loader2Icon,
  MessageSquareTextIcon,
  PhoneIcon,
  SendIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  UsersIcon,
  Volume2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { AgentAiActivityChart } from "@/components/ai-assistant/AgentAiActivityChart";
import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { testSingleAiAgentAction } from "@/features/ai-assistant/actions/test-single-ai-agent";
import type { AgentCrmPreview } from "@/types/ai-agent-test.types";
import { INTEGRATION_CHANNEL_LIST } from "@/features/integrations";
import { cn } from "@/lib/utils";
import type {
  AgentActivityPoint,
  AgentDashboardStats,
  AgentRecentDialogue,
  AiAgentTab,
} from "@/types/agent-dashboard.types";
import type { AiAssistantPageData } from "@/types/channel-workspace.types";
import {
  formatDurationMinutes,
  formatMetricValue,
  formatRelativeTime,
} from "@/utils/dashboard";

type AgentDashboardPanelProps = {
  data: AiAssistantPageData;
  stats: AgentDashboardStats;
  recentDialogues: AgentRecentDialogue[];
  aiActivity: AgentActivityPoint[];
  onNavigate: (tab: AiAgentTab) => void;
};

function AgentActiveIcon({ active }: { active: boolean }) {
  return (
    <div className="relative flex size-24 items-center justify-center">
      {active ? (
        <span
          className="absolute inset-0 rounded-full border-[3px] border-emerald-500/15 border-t-emerald-500 border-r-emerald-400 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
      ) : null}
      <div
        className={cn(
          "relative z-10 flex size-20 items-center justify-center rounded-full shadow-md",
          active
            ? "bg-emerald-500 text-white shadow-emerald-500/25"
            : "bg-muted text-muted-foreground",
        )}
      >
        <BotIcon className="size-10" />
      </div>
    </div>
  );
}

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  crmPreview?: AgentCrmPreview | null;
};

const ACTION_CARD_MIN_HEIGHT = "min-h-[260px]";

function formatChannelLabel(channel: string): string {
  const match = INTEGRATION_CHANNEL_LIST.find((item) => item.id === channel);
  return match?.label ?? channel.replace(/_/g, " ");
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase() || "CU";
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof BotIcon;
  iconClassName: string;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-start gap-4 p-5 md:p-6">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl",
            iconClassName,
          )}
        >
          <Icon className="size-6" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          {hint ? (
            <p className="text-sm text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardActionCard({
  title,
  children,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
}: {
  title: string;
  children: ReactNode;
  actionLabel: string;
  actionIcon: typeof BotIcon;
  onAction: () => void;
}) {
  return (
    <Card className={cn("flex flex-col shadow-none", ACTION_CARD_MIN_HEIGHT)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pb-5">
        <div className="flex flex-1 flex-col justify-center">{children}</div>
        <Button
          type="button"
          variant="outline"
          className="mt-5 w-full"
          onClick={onAction}
        >
          <ActionIcon className="size-4" />
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function CrmPreviewPanel({ preview }: { preview: AgentCrmPreview }) {
  return (
    <div className="mt-2 rounded-xl border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">
        CRM preview · {preview.intent} ({Math.round(preview.confidence * 100)}%)
      </p>
      {preview.plannedActions.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {preview.plannedActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2">No CRM actions planned.</p>
      )}
      {preview.contactUpdates.length > 0 ? (
        <p className="mt-2">
          Contact updates: {preview.contactUpdates.join("; ")}
        </p>
      ) : null}
      {preview.blockedActions.length > 0 ? (
        <p className="mt-2 text-amber-700">
          Blocked by permissions: {preview.blockedActions.join(", ")}
        </p>
      ) : null}
      {preview.clientSummary ? (
        <p className="mt-2">Follow-up: {preview.clientSummary}</p>
      ) : null}
    </div>
  );
}

function AgentTestChatCard() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = messagesScrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isTesting]);

  async function sendMessage() {
    const text = draft.trim();

    if (!text || isTesting) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setIsTesting(true);

    try {
      const history = messages.map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));
      const result = await testSingleAiAgentAction({ message: text, history });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.reply,
          crmPreview: result.crmPreview,
        },
      ]);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <Card className="flex h-[540px] min-h-0 flex-col overflow-hidden shadow-none">
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="text-lg">Test Agent</CardTitle>
        <CardDescription>
          Chat with your agent — same Phase 1 reply plus Phase 2 CRM preview.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pb-6">
        <div
          ref={messagesScrollRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden rounded-2xl border bg-muted/10 p-4"
        >
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BotIcon className="size-8" />
              </div>
              <p className="max-w-xs text-sm text-muted-foreground">
                Ask about pricing, booking, CRM tasks, or handoff rules.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.role === "assistant" ? (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <BotIcon className="size-4" />
                  </div>
                ) : null}
                <div className="max-w-[88%] space-y-2">
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-6",
                      message.role === "user"
                        ? "bg-sky-100 text-sky-950"
                        : "bg-background ring-1 ring-foreground/10",
                    )}
                  >
                    {message.content}
                  </div>
                  {message.role === "assistant" && message.crmPreview ? (
                    <CrmPreviewPanel preview={message.crmPreview} />
                  ) : null}
                </div>
              </div>
            ))
          )}
          {isTesting ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Agent is thinking...
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>
        <form
          className="flex shrink-0 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Enter a test message..."
            className="h-11"
            disabled={isTesting}
          />
          <Button
            type="submit"
            size="icon"
            className="size-11 shrink-0"
            disabled={isTesting || !draft.trim()}
          >
            <SendIcon className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function AgentDashboardPanel({
  data,
  stats,
  recentDialogues,
  aiActivity,
  onNavigate,
}: AgentDashboardPanelProps) {
  const profile = data.assistantProfile;
  const agentActive = Boolean(profile?.canReply && data.enabledChannelCount > 0);
  const connectedChannels = data.channels.filter(
    (entry) => entry.settings.isChannelConnected,
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 overflow-x-hidden p-4 pb-8 md:p-6 md:pb-10">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="AI text replies"
          value={formatMetricValue(stats.aiTextReplies)}
          icon={MessageSquareTextIcon}
          iconClassName="bg-violet-100 text-violet-600"
        />
        <MetricCard
          label="Voice AI replies"
          value={formatMetricValue(stats.voiceAiReplies)}
          hint={`${formatMetricValue(stats.voiceAiReplyMinutes)} min`}
          icon={Volume2Icon}
          iconClassName="bg-fuchsia-100 text-fuchsia-600"
        />
        <MetricCard
          label="AI call time"
          value={formatDurationMinutes(stats.totalCallMinutes)}
          hint="Inbound & outbound"
          icon={PhoneIcon}
          iconClassName="bg-sky-100 text-sky-600"
        />
        <MetricCard
          label="Contacts served"
          value={formatMetricValue(stats.contactsServed)}
          icon={UsersIcon}
          iconClassName="bg-emerald-100 text-emerald-600"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardActionCard
          title="Agent status"
          actionLabel="Open agent settings"
          actionIcon={Settings2Icon}
          onAction={() => onNavigate("settings")}
        >
          <div className="flex flex-col items-center px-2 text-center">
            <AgentActiveIcon active={agentActive} />
            <p className="mt-5 text-lg font-semibold">
              {agentActive ? "Agent active" : "Agent inactive"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {agentActive
                ? "Online and ready to reply"
                : `${data.enabledChannelCount} active channel(s)`}
            </p>
          </div>
        </DashboardActionCard>

        <DashboardActionCard
          title="Active channels"
          actionLabel="Manage channels"
          actionIcon={SlidersHorizontalIcon}
          onAction={() => onNavigate("channels")}
        >
          <div className="space-y-3 px-1">
            {connectedChannels.length > 0 ? (
              connectedChannels.slice(0, 4).map(({ channel, settings }) => (
                <div
                  key={channel}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <ChannelBrandIcon channel={channel} className="size-5" />
                    <span className="font-medium">{formatChannelLabel(channel)}</span>
                  </div>
                  <Badge
                    variant={settings.aiEnabled ? "default" : "secondary"}
                    className={cn(
                      settings.aiEnabled &&
                        "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
                    )}
                  >
                    {settings.aiEnabled ? "Online" : "Off"}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                No connected channels yet.
              </p>
            )}
          </div>
        </DashboardActionCard>

        <DashboardActionCard
          title="Knowledge base"
          actionLabel="Open knowledge base"
          actionIcon={BookOpenIcon}
          onAction={() => onNavigate("knowledge")}
        >
          <div className="flex flex-col items-center px-2 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <BookOpenIcon className="size-7" />
            </div>
            <p className="mt-4 text-3xl font-semibold">
              {data.knowledgeEntries.length}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              articles in the knowledge base
            </p>
          </div>
        </DashboardActionCard>
      </div>

      <AgentAiActivityChart initialPoints={aiActivity} initialDays={1} />

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 shadow-none">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Recent dialogues</CardTitle>
                <CardDescription>
                  Latest customer conversations across channels.
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={DASHBOARD_ROUTES.chats}>View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
              {recentDialogues.length > 0 ? (
                recentDialogues.map((dialogue) => (
                  <Link
                    key={dialogue.id}
                    href={`${DASHBOARD_ROUTES.chats}?conversation=${dialogue.id}`}
                    className="flex items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
                      {getInitials(dialogue.contactName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{dialogue.contactName}</p>
                        <Badge variant="outline" className="text-[11px]">
                          {formatChannelLabel(dialogue.channel)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(dialogue.updatedAt)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {dialogue.messagePreview}
                      </p>
                    </div>
                    <Badge
                      variant={dialogue.status === "resolved" ? "default" : "secondary"}
                      className={cn(
                        "shrink-0",
                        dialogue.status === "resolved" &&
                          "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
                        dialogue.status === "waiting" &&
                          "bg-amber-100 text-amber-900 hover:bg-amber-100",
                      )}
                    >
                      {dialogue.status === "resolved" ? "Resolved" : "Waiting"}
                    </Badge>
                  </Link>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No dialogues yet. Connect a channel to start receiving messages.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <AgentTestChatCard />
      </div>
    </div>
  );
}

export function AgentSectionBackButton({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <div className="border-b px-4 py-3">
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeftIcon className="size-4" />
        Back to dashboard
      </Button>
    </div>
  );
}
