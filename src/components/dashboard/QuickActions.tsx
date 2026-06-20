import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import {
  BookOpenIcon,
  BotIcon,
  MessageSquareIcon,
  PlugIcon,
} from "lucide-react";

const QUICK_ACTIONS = [
  {
    id: "connect",
    label: "Connect channel",
    href: DASHBOARD_ROUTES.integrations,
    icon: PlugIcon,
  },
  {
    id: "knowledge",
    label: "Add Knowledge",
    href: DASHBOARD_ROUTES.knowledgeBase,
    icon: BookOpenIcon,
  },
  {
    id: "ai",
    label: "Configure AI",
    href: DASHBOARD_ROUTES.aiAssistantSection,
    icon: BotIcon,
  },
  {
    id: "inbox",
    label: "Open Inbox",
    href: DASHBOARD_ROUTES.chats,
    icon: MessageSquareIcon,
  },
] as const;

type QuickActionsProps = {
  enabled: boolean;
};

export function QuickActions({ enabled }: QuickActionsProps) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          {enabled
            ? "Jump to the most common setup and management tasks."
            : "Connect a messaging channel in Integrations to unlock quick actions."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.id}
              asChild={enabled}
              variant="outline"
              disabled={!enabled}
              className="h-auto justify-start gap-2 px-3 py-3"
            >
              {enabled ? (
                <Link href={action.href}>
                  <action.icon className="size-4 shrink-0 text-primary" />
                  <span>{action.label}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-2">
                  <action.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span>{action.label}</span>
                </span>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
