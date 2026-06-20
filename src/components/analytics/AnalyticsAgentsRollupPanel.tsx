"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ANALYTICS_MESSAGES } from "@/features/analytics/constants";
import type { AgentAnalyticsRollupItem } from "@/types/analytics.types";
import { buildAiAssistantHref } from "@/utils/ai-assistant-url";
import { formatMetricValue } from "@/utils/dashboard";

type AnalyticsAgentsRollupPanelProps = {
  agents: AgentAnalyticsRollupItem[];
};

export function AnalyticsAgentsRollupPanel({
  agents,
}: AnalyticsAgentsRollupPanelProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {ANALYTICS_MESSAGES.aiOpsAgentsTitle}
        </CardTitle>
        <CardDescription>
          {ANALYTICS_MESSAGES.aiOpsAgentsDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {ANALYTICS_MESSAGES.aiOpsAgentsEmpty}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">
                    {ANALYTICS_MESSAGES.aiOpsAgentsColumnName}
                  </th>
                  <th className="pb-2 pr-3 font-medium">
                    {ANALYTICS_MESSAGES.aiOpsAgentsColumnStatus}
                  </th>
                  <th className="pb-2 pr-3 text-right font-medium">
                    {ANALYTICS_MESSAGES.aiOpsAgentsColumnContacts}
                  </th>
                  <th className="pb-2 pr-3 text-right font-medium">
                    {ANALYTICS_MESSAGES.aiOpsAgentsColumnReplies}
                  </th>
                  <th className="pb-2 pr-3 text-right font-medium">
                    {ANALYTICS_MESSAGES.aiOpsAgentsColumnLast7d}
                  </th>
                  <th className="pb-2 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {agents.map((agent) => (
                  <tr key={agent.agentId} className="align-middle">
                    <td className="py-3 pr-3 font-medium">{agent.agentName}</td>
                    <td className="py-3 pr-3">
                      <Badge variant={agent.enabled ? "default" : "secondary"}>
                        {agent.enabled
                          ? ANALYTICS_MESSAGES.aiOpsAgentOn
                          : ANALYTICS_MESSAGES.aiOpsAgentOff}
                      </Badge>
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums">
                      {formatMetricValue(agent.contactsServed)}
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums">
                      {formatMetricValue(agent.totalAiReplies)}
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums">
                      {formatMetricValue(agent.aiRepliesLast7Days)}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 px-2"
                        asChild
                      >
                        <Link
                          href={buildAiAssistantHref({
                            section: "agents",
                            agent: agent.agentId,
                            analytics: true,
                          })}
                        >
                          {ANALYTICS_MESSAGES.aiOpsViewAgent}
                          <ArrowRightIcon className="size-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
