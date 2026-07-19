"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { BotIcon, PowerIcon, SparklesIcon } from "lucide-react";

import { useAiAssistantChromeRegistration } from "@/components/ai-assistant/ai-assistant-chrome-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import type { AiAssistantPageData } from "@/types/channel-workspace.types";
import {
  getAiAssistantTabPath,
  resolveAiAgentTabFromPathname,
} from "@/utils/ai-assistant-routes";

type AiAssistantShellProps = {
  data: AiAssistantPageData;
  children: React.ReactNode;
};

function ActivationGate() {
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
              Complete setup step by step — agent behavior, voice calls, then
              activate when required fields are filled.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {["Behavior", "Calls AI", "Activate"].map((item) => (
              <div
                key={item}
                className="rounded-xl border bg-muted/20 p-4 text-center"
              >
                <div className="mx-auto mb-2 flex size-8 items-center justify-center rounded-full bg-background">
                  <SparklesIcon className="size-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">{item}</p>
              </div>
            ))}
          </div>
          <Button type="button" size="lg" className="w-full" asChild>
            <Link href={`${DASHBOARD_ROUTES.aiAssistantSettings}?setup=1`}>
              <PowerIcon className="size-4" />
              Set up & activate AI Agent
            </Link>
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
  const [activated] = useState(
    isAgentActive || data.enabledChannelCount > 0,
  );

  const isSetupRoute =
    pathname.startsWith(DASHBOARD_ROUTES.aiAssistantSettings) ||
    pathname.startsWith(DASHBOARD_ROUTES.aiAssistantChannels) ||
    pathname.startsWith(DASHBOARD_ROUTES.aiAssistantKnowledge) ||
    pathname.startsWith(DASHBOARD_ROUTES.aiAssistantVoice);

  const shouldShowActivation =
    !activated && !isAgentActive && !isSetupRoute;

  const handleTabChange = useCallback(
    (tab: typeof activeTab) => {
      router.push(getAiAssistantTabPath(tab));
    },
    [router],
  );

  // Keep chrome registration for heading context, but never show header tab buttons.
  useAiAssistantChromeRegistration(
    shouldShowActivation
      ? null
      : {
          activeTab,
          onTabChange: handleTabChange,
          showTabs: false,
        },
  );

  if (shouldShowActivation) {
    return (
      <div className="flex dashboard-main-frame min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
        <ActivationGate />
      </div>
    );
  }

  return (
    <div className="flex dashboard-main-frame min-h-0 w-full min-w-0 flex-col overflow-x-hidden overflow-hidden bg-background">
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
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
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
