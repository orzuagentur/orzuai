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
    label: "Connect WhatsApp",
    href: DASHBOARD_ROUTES.integrations,
    icon: PlugIcon,
  },
  {
    label: "Add Knowledge",
    href: DASHBOARD_ROUTES.knowledgeBase,
    icon: BookOpenIcon,
  },
  {
    label: "Configure AI",
    href: DASHBOARD_ROUTES.aiAssistant,
    icon: BotIcon,
  },
  {
    label: "Open Inbox",
    href: DASHBOARD_ROUTES.chats,
    icon: MessageSquareIcon,
  },
] as const;

export function QuickActions() {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Jump to the most common setup and management tasks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.href}
              asChild
              variant="outline"
              className="h-auto justify-start gap-2 px-3 py-3"
            >
              <Link href={action.href}>
                <action.icon className="size-4 shrink-0 text-primary" />
                <span>{action.label}</span>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
