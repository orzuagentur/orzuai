import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { buildIntegrationActivateHref } from "@/features/integrations";
import type { RecentConversationItem } from "@/types/dashboard.types";
import { formatRelativeTime } from "@/utils/dashboard";

type RecentConversationsProps = {
  conversations: RecentConversationItem[];
};

function getStatusVariant(
  status: string,
): "default" | "secondary" | "outline" {
  if (status === "active") {
    return "default";
  }

  if (status === "archived") {
    return "secondary";
  }

  return "outline";
}

export function RecentConversations({
  conversations,
}: RecentConversationsProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>
            Latest customer conversations across all connected channels.
          </CardDescription>
        </div>
        {conversations.length > 0 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={DASHBOARD_ROUTES.chats}>View all</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No conversations yet. Connect a channel in Integrations to start
              receiving messages.
            </p>
            <Button asChild size="sm">
              <Link href={buildIntegrationActivateHref("whatsapp")}>
                Connect a channel
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">
                    {conversation.contactName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {conversation.contactPhone}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant={getStatusVariant(conversation.status)}>
                    {conversation.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(conversation.updatedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
