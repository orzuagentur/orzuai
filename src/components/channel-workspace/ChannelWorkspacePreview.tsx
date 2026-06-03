import Link from "next/link";
import { BarChart3, Bot, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CHANNEL_WORKSPACE_MESSAGES,
  getChannelLabel,
} from "@/features/channel-workspace";
import {
  buildChannelWorkspaceHref,
  type IntegrationChannelId,
} from "@/features/integrations";
import type { ChannelWorkspaceSummary } from "@/types/channel-workspace.types";

type ChannelWorkspacePreviewProps = {
  channel: IntegrationChannelId;
  kind: "contacts" | "ai-assistant" | "analytics";
  summary: ChannelWorkspaceSummary;
};

export function ChannelWorkspacePreview({
  channel,
  kind,
  summary,
}: ChannelWorkspacePreviewProps) {
  const label = getChannelLabel(channel);
  const href = buildChannelWorkspaceHref(channel, kind);

  const title =
    kind === "contacts"
      ? CHANNEL_WORKSPACE_MESSAGES.contactsCount(summary.contactsCount)
      : kind === "ai-assistant"
        ? CHANNEL_WORKSPACE_MESSAGES.aiTitle
        : CHANNEL_WORKSPACE_MESSAGES.analyticsTitle;

  const Icon =
    kind === "contacts" ? Users : kind === "ai-assistant" ? Bot : BarChart3;

  const description =
    kind === "contacts"
      ? CHANNEL_WORKSPACE_MESSAGES.contactsEmptyHint
      : kind === "ai-assistant"
        ? summary.aiEnabled
          ? CHANNEL_WORKSPACE_MESSAGES.aiEnabledOn
          : CHANNEL_WORKSPACE_MESSAGES.aiEnabledOff
        : `${summary.totalMessages} messages · ${summary.contactsCount} contacts on ${label}`;

  return (
    <Card className="max-w-2xl shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-primary" />
          <CardTitle>
            {title} — {label}
          </CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href={href}>Open full view</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
