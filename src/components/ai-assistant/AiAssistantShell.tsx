"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  BotIcon,
  CheckCircle2Icon,
  Loader2Icon,
  PowerIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useAiAssistantChromeRegistration } from "@/components/ai-assistant/ai-assistant-chrome-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { activateAiAgentAction } from "@/features/ai-assistant/actions/activate-ai-agent";
import type { AiAssistantPageData } from "@/types/channel-workspace.types";
import {
  getAiAssistantTabPath,
  resolveAiAgentTabFromPathname,
} from "@/utils/ai-assistant-routes";

type AiAssistantShellProps = {
  data: AiAssistantPageData;
  children: React.ReactNode;
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

export function AiAssistantShell({ data, children }: AiAssistantShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = resolveAiAgentTabFromPathname(pathname);
  const isAgentActive = data.assistantProfile?.canReply ?? false;
  const [activated, setActivated] = useState(
    isAgentActive || data.enabledChannelCount > 0,
  );
  const shouldShowActivation = !activated && !isAgentActive;

  const handleTabChange = useCallback(
    (tab: typeof activeTab) => {
      router.push(getAiAssistantTabPath(tab));
    },
    [router],
  );

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
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export function AiAssistantPageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="border-b bg-background/95 px-4 py-4 backdrop-blur md:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-1">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-1 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            ← {backLabel}
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
