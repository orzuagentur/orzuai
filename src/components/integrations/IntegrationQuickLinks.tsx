import Link from "next/link";
import { BarChart3, Bot, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildChannelWorkspaceHref,
  INTEGRATIONS_MESSAGES,
  INTEGRATION_SECTION_LIST,
  type IntegrationChannelId,
} from "@/features/integrations";

type IntegrationQuickLinksProps = {
  channel: IntegrationChannelId;
  showHubSections?: boolean;
};

export function IntegrationQuickLinks({
  channel,
  showHubSections = true,
}: IntegrationQuickLinksProps) {
  const workspaceLinks = [
    {
      label: INTEGRATIONS_MESSAGES.sectionContacts,
      href: buildChannelWorkspaceHref(channel, "contacts"),
      icon: Users,
    },
    {
      label: INTEGRATIONS_MESSAGES.sectionAiAssistant,
      href: buildChannelWorkspaceHref(channel, "ai-assistant"),
      icon: Bot,
    },
    {
      label: INTEGRATIONS_MESSAGES.sectionAnalytics,
      href: buildChannelWorkspaceHref(channel, "analytics"),
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <p className="text-sm font-medium">{INTEGRATIONS_MESSAGES.connectedQuickLinks}</p>
      <div className="flex flex-wrap gap-2">
        {showHubSections
          ? INTEGRATION_SECTION_LIST.filter((s) => s.id !== "activate").map(
              (section) => (
                <Button key={section.id} variant="outline" size="sm" asChild>
                  <Link href={section.href(channel)}>{section.label}</Link>
                </Button>
              ),
            )
          : null}
        {workspaceLinks.map((link) => (
          <Button key={link.href} variant="secondary" size="sm" asChild>
            <Link href={link.href}>
              <link.icon className="size-3.5" />
              {link.label}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
