import { redirect } from "next/navigation";
import { Suspense } from "react";

import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { ONBOARDING_MESSAGES } from "@/features/onboarding/constants";
import { getCurrentUser } from "@/services/auth.service";
import { getPrimaryBusiness } from "@/services/business.service";
import { getChannelAiSettings } from "@/services/channel-workspace.service";
import {
  getEmptyOnboardingProgress,
  getOnboardingProgress,
} from "@/services/onboarding.service";
import { getWhatsAppEmbeddedSignupConfig } from "@/services/whatsapp.service";
import { mapBusinessToProfile } from "@/utils/business";

type OnboardingPageProps = {
  searchParams: Promise<{ step?: string }>;
};

function OnboardingWizardFallback() {
  return <div className="h-96 animate-pulse rounded-xl border bg-muted/30" />;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const user = await getCurrentUser();
  const business = user ? await getPrimaryBusiness(user.id) : null;
  const defaultBusinessName =
    typeof user?.user_metadata?.business_name === "string"
      ? user.user_metadata.business_name
      : undefined;
  const params = await searchParams;
  const requestedStep = Number(params.step);
  const progress = business
    ? await getOnboardingProgress(business.id)
    : getEmptyOnboardingProgress();

  if (progress.isComplete) {
    redirect(DASHBOARD_ROUTES.overview);
  }

  const step = Number.isFinite(requestedStep)
    ? Math.min(5, Math.max(1, requestedStep))
    : progress.recommendedStep;

  const [whatsappEmbeddedSignupConfig, aiSettings] = await Promise.all([
    getWhatsAppEmbeddedSignupConfig(),
    business && progress.connectedChannel
      ? getChannelAiSettings(progress.connectedChannel)
      : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {ONBOARDING_MESSAGES.pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          {ONBOARDING_MESSAGES.pageDescription}
        </p>
      </div>

      <Suspense fallback={<OnboardingWizardFallback />}>
        <OnboardingWizard
          step={step}
          progress={progress}
          business={business ? mapBusinessToProfile(business) : null}
          defaultBusinessName={defaultBusinessName}
          whatsappEmbeddedSignupConfig={whatsappEmbeddedSignupConfig}
          aiSettings={aiSettings}
        />
      </Suspense>
    </div>
  );
}
