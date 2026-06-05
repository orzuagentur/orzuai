"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { BusinessProfileForm } from "@/components/business/BusinessProfileForm";
import { KnowledgeEntryForm } from "@/components/knowledge-base/KnowledgeEntryForm";
import { OnboardingProgressRing } from "@/components/onboarding/OnboardingProgressRing";
import { WhatsAppManualConnect } from "@/components/whatsapp/WhatsAppManualConnect";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  saveChannelAiSettingsAction,
  testChannelAiReplyAction,
} from "@/features/channel-workspace";
import {
  ONBOARDING_MESSAGES,
  ONBOARDING_STEPS,
} from "@/features/onboarding/constants";
import { resolveGeminiModel, type GeminiModelId } from "@/lib/gemini/constants";
import { cn } from "@/lib/utils";
import type { OnboardingProgress } from "@/services/onboarding.service";
import type { BusinessProfileData } from "@/types/business.types";
import type { ChannelAiSettingsData } from "@/types/channel-workspace.types";
import type { WhatsAppConnectConfig } from "@/types/whatsapp.types";

type OnboardingWizardProps = {
  step: number;
  progress: OnboardingProgress;
  business: BusinessProfileData | null;
  defaultBusinessName?: string;
  whatsappConfig: WhatsAppConnectConfig;
  aiSettings: ChannelAiSettingsData | null;
};

function goToStep(router: ReturnType<typeof useRouter>, step: number) {
  router.push(`${DASHBOARD_ROUTES.onboarding}?step=${step}`);
}

export function OnboardingWizard({
  step,
  progress,
  business,
  defaultBusinessName,
  whatsappConfig,
  aiSettings,
}: OnboardingWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testReply, setTestReply] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isEnablingAi, setIsEnablingAi] = useState(false);

  const activeStep = Math.min(
    5,
    Math.max(1, Number(searchParams.get("step")) || step),
  );

  async function handleEnableAi() {
    if (!aiSettings?.channel) {
      return;
    }

    setIsEnablingAi(true);

    try {
      const result = await saveChannelAiSettingsAction({
        channel: aiSettings.channel,
        aiEnabled: true,
        model: resolveGeminiModel(aiSettings.model) as GeminiModelId,
        language: aiSettings.language,
        systemPrompt: aiSettings.systemPrompt,
      });

      if (result.success) {
        router.refresh();
        goToStep(router, 5);
        return;
      }

      toast.error(result.message ?? "Unable to enable AI.");
    } finally {
      setIsEnablingAi(false);
    }
  }

  async function handleTest() {
    if (!aiSettings?.channel || !testMessage.trim()) {
      return;
    }

    setIsTesting(true);
    setTestReply(null);

    try {
      const result = await testChannelAiReplyAction({
        channel: aiSettings.channel,
        testMessage: testMessage.trim(),
      });

      if (result.success) {
        setTestReply(result.reply);
        return;
      }

      toast.error(result.message);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex items-center gap-4">
        <OnboardingProgressRing percent={progress.percentComplete} />
        <div className="space-y-1">
          <p className="text-sm font-medium">{ONBOARDING_MESSAGES.progressLabel}</p>
          <p className="text-sm text-muted-foreground">
            Step {activeStep} of {ONBOARDING_STEPS.length}
          </p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2">
        {ONBOARDING_STEPS.map((item, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === activeStep;
          const isDone = stepNumber < activeStep;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => goToStep(router, stepNumber)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isDone
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {activeStep === 1 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{ONBOARDING_MESSAGES.stepBusinessTitle}</CardTitle>
            <CardDescription>
              {ONBOARDING_MESSAGES.stepBusinessDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BusinessProfileForm
              business={business}
              defaultBusinessName={defaultBusinessName}
              onSuccess={() => {
                router.refresh();
                goToStep(router, 2);
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      {activeStep === 2 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{ONBOARDING_MESSAGES.stepChannelTitle}</CardTitle>
            <CardDescription>
              {ONBOARDING_MESSAGES.stepChannelDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <WhatsAppManualConnect
              config={whatsappConfig}
              onConnected={() => {
                router.refresh();
                goToStep(router, 3);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => goToStep(router, 1)}>
                {ONBOARDING_MESSAGES.back}
              </Button>
              {progress.hasConnectedChannel ? (
                <Button type="button" onClick={() => goToStep(router, 3)}>
                  {ONBOARDING_MESSAGES.continue}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeStep === 3 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{ONBOARDING_MESSAGES.stepKnowledgeTitle}</CardTitle>
            <CardDescription>
              {ONBOARDING_MESSAGES.stepKnowledgeDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => goToStep(router, 2)}>
              {ONBOARDING_MESSAGES.back}
            </Button>
            <Button type="button" onClick={() => setKnowledgeOpen(true)}>
              {ONBOARDING_MESSAGES.stepKnowledgeAdd}
            </Button>
            <Button type="button" onClick={() => goToStep(router, 4)}>
              {ONBOARDING_MESSAGES.stepKnowledgeSkip}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {activeStep === 4 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{ONBOARDING_MESSAGES.stepAiTitle}</CardTitle>
            <CardDescription>{ONBOARDING_MESSAGES.stepAiDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {progress.hasAiEnabled ? (
              <p className="text-sm text-muted-foreground">
                AI auto-replies are already enabled for your connected channel.
              </p>
            ) : (
              <Button type="button" disabled={isEnablingAi} onClick={handleEnableAi}>
                {isEnablingAi ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                {ONBOARDING_MESSAGES.stepAiEnable}
              </Button>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => goToStep(router, 3)}>
                {ONBOARDING_MESSAGES.back}
              </Button>
              <Button
                type="button"
                onClick={() => goToStep(router, 5)}
                disabled={!progress.hasAiEnabled}
              >
                {ONBOARDING_MESSAGES.continue}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeStep === 5 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{ONBOARDING_MESSAGES.stepTestTitle}</CardTitle>
            <CardDescription>{ONBOARDING_MESSAGES.stepTestDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="onboarding-test-message">Sample message</Label>
              <Textarea
                id="onboarding-test-message"
                value={testMessage}
                onChange={(event) => setTestMessage(event.target.value)}
                placeholder={ONBOARDING_MESSAGES.stepTestPlaceholder}
                rows={3}
              />
            </div>
            <Button
              type="button"
              disabled={isTesting || !testMessage.trim() || !aiSettings?.channel}
              onClick={handleTest}
            >
              {isTesting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              {ONBOARDING_MESSAGES.stepTestButton}
            </Button>
            {testReply ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm">{testReply}</div>
            ) : null}
            <Button asChild>
              <Link href={DASHBOARD_ROUTES.overview}>
                {ONBOARDING_MESSAGES.stepFinish}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={knowledgeOpen} onOpenChange={setKnowledgeOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{ONBOARDING_MESSAGES.stepKnowledgeAdd}</DialogTitle>
            <DialogDescription>
              {ONBOARDING_MESSAGES.stepKnowledgeDescription}
            </DialogDescription>
          </DialogHeader>
          <KnowledgeEntryForm
            onSuccess={() => {
              setKnowledgeOpen(false);
              router.refresh();
              goToStep(router, 4);
            }}
            onCancel={() => setKnowledgeOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
