"use client";

import { CrmFunnelPanel } from "@/components/analytics/CrmFunnelPanel";
import { LeadSourcePanel } from "@/components/analytics/LeadSourcePanel";
import { RevenueMetricsPanel } from "@/components/analytics/RevenueMetricsPanel";
import { SentimentPanel } from "@/components/analytics/SentimentPanel";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import type { AnalyticsPageData } from "@/types/channel-workspace.types";
import type { PipelineStage } from "@/types/contact.types";
import { buildAnalyticsCrmPipelineHref } from "@/utils/analytics-crm-links";

type AnalyticsSalesPanelProps = {
  leadSources: AnalyticsPageData["leadSources"];
  crmFunnel: AnalyticsPageData["crmFunnel"];
  revenue: AnalyticsPageData["revenue"];
  sentiment: AnalyticsPageData["sentiment"];
};

export function AnalyticsSalesPanel({
  leadSources,
  crmFunnel,
  revenue,
  sentiment,
}: AnalyticsSalesPanelProps) {
  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
      <div>
        <h2 className="text-base font-semibold">{ANALYTICS_MESSAGES.salesPanelTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {ANALYTICS_MESSAGES.salesPanelDescription}
        </p>
      </div>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {ANALYTICS_MESSAGES.salesStepLeads}
        </p>
        <LeadSourcePanel
          sources={leadSources}
          channelHref={(channel, count) =>
            count > 0
              ? buildAnalyticsCrmPipelineHref({ channel })
              : null
          }
          channelLinkLabel={(count) => ANALYTICS_MESSAGES.viewChannelContacts(count)}
        />
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {ANALYTICS_MESSAGES.salesStepFunnel}
        </p>
        <CrmFunnelPanel
          funnel={crmFunnel}
          stageHref={(stage, count) =>
            count > 0
              ? buildAnalyticsCrmPipelineHref({
                  stage: stage as PipelineStage,
                })
              : null
          }
          stageLinkLabel={(count) => ANALYTICS_MESSAGES.viewContacts(count)}
        />
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {ANALYTICS_MESSAGES.salesStepRevenue}
        </p>
        <RevenueMetricsPanel
          metrics={revenue}
          crmHref={buildAnalyticsCrmPipelineHref()}
        />
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {ANALYTICS_MESSAGES.salesStepSentiment}
        </p>
        <SentimentPanel
          breakdown={sentiment}
          negativeHref={
            sentiment.negative > 0
              ? buildAnalyticsCrmPipelineHref({ stage: "new" })
              : null
          }
        />
      </section>
    </div>
  );
}
