"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { AutomationsChannelBadgeRow } from "@/components/automations/AutomationsChannelBadgeRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AutomationOnOffControl } from "@/components/automations/AutomationOnOffControl";
import {
  enableRecommendedStackAction,
  setAutomationRecipeAction,
} from "@/features/automations/actions/set-automation-recipe";
import {
  AUTOMATION_RULES,
  isRecipeEnabled,
  isRuleEnabled,
  type AutomationRecipeId,
} from "@/features/automations/rule-catalog";
import {
  AUTOMATION_RECIPES,
  AUTOMATIONS_MESSAGES,
} from "@/features/automations/constants";
import type { IntegrationChannelStatusMap } from "@/features/integrations";
import type {
  AutomationStats,
  AutomationsPageData,
} from "@/types/automations.types";
import type { MessagingIntegrationChannelId } from "@/features/integrations/constants";
import { buildAutomationsHref } from "@/utils/automations-url";

type AutomationsOverviewPanelProps = {
  stats: AutomationStats;
  followUpAgent: AutomationsPageData["followUpAgent"];
  channelStatuses: IntegrationChannelStatusMap;
  visibleChannelIds: MessagingIntegrationChannelId[];
};

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export function AutomationsOverviewPanel({
  stats,
  followUpAgent,
  channelStatuses,
  visibleChannelIds,
}: AutomationsOverviewPanelProps) {
  const router = useRouter();
  const [pendingRecipeId, setPendingRecipeId] = useState<AutomationRecipeId | "all" | null>(
    null,
  );

  async function handleRecipeToggle(recipeId: AutomationRecipeId, enabled: boolean) {
    setPendingRecipeId(recipeId);

    try {
      const result = await setAutomationRecipeAction(recipeId, enabled);

      if (!result.success) {
        toast.error(result.message ?? AUTOMATIONS_MESSAGES.ruleSaveFailed);
        return;
      }

      toast.success(AUTOMATIONS_MESSAGES.ruleSaved);
      router.refresh();
    } finally {
      setPendingRecipeId(null);
    }
  }

  async function handleEnableAll() {
    setPendingRecipeId("all");

    try {
      const result = await enableRecommendedStackAction();

      if (!result.success) {
        toast.error(result.message ?? AUTOMATIONS_MESSAGES.stackEnableFailed);
        return;
      }

      toast.success(AUTOMATIONS_MESSAGES.stackEnabled);
      router.refresh();
    } finally {
      setPendingRecipeId(null);
    }
  }

  const activeRules = AUTOMATION_RULES.filter((rule) =>
    isRuleEnabled(rule.id, followUpAgent),
  );

  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={AUTOMATIONS_MESSAGES.statsFollowUps}
          value={stats.followUpsSent}
        />
        <StatCard
          label={AUTOMATIONS_MESSAGES.statsQualified}
          value={stats.qualifiedContacts}
        />
        <StatCard
          label={AUTOMATIONS_MESSAGES.statsTasks}
          value={stats.crmTasksCreated}
        />
        <StatCard
          label={AUTOMATIONS_MESSAGES.statsActiveRules}
          value={stats.activeRules}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">
              {AUTOMATIONS_MESSAGES.recommendedTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {AUTOMATIONS_MESSAGES.recommendedIntro}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={pendingRecipeId !== null}
            onClick={() => void handleEnableAll()}
          >
            {pendingRecipeId === "all" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              AUTOMATIONS_MESSAGES.enableAllRecipes
            )}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-1 lg:max-w-md">
          {AUTOMATION_RECIPES.map((recipe) => (
            <Card key={recipe.id} className="shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{recipe.name}</CardTitle>
                <CardDescription>{recipe.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <AutomationOnOffControl
                  enabled={isRecipeEnabled(recipe.id, followUpAgent)}
                  disabled={pendingRecipeId === recipe.id}
                  onChange={(enabled) =>
                    void handleRecipeToggle(recipe.id, enabled)
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            {AUTOMATIONS_MESSAGES.runningNowTitle}
          </h2>
          <AutomationsChannelBadgeRow
            channelStatuses={channelStatuses}
            visibleChannelIds={visibleChannelIds}
          />
        </div>
        {activeRules.length === 0 ? (
          <EmptyState
            variant="generic"
            title={AUTOMATIONS_MESSAGES.emptyOverviewRulesTitle}
            description={AUTOMATIONS_MESSAGES.emptyOverviewRulesDescription}
            actionLabel={AUTOMATIONS_MESSAGES.tabRules}
            actionHref={buildAutomationsHref({ tab: "rules" })}
            className="rounded-lg border py-10"
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {activeRules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {rule.triggerSummary}
                  </p>
                </div>
                <Badge>On</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button type="button" variant="outline" size="sm" asChild>
        <Link href={buildAutomationsHref({ tab: "rules" })}>Manage rules</Link>
      </Button>
    </div>
  );
}
