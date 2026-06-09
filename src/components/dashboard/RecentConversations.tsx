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
import type { RecentConversationItem } from "@/types/dashboard.types";
import { formatRelativeTime } from "@/utils/dashboard";
import { cn } from "@/lib/utils";

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

function buildConversationHref(conversationId: string): string {
  return `${DASHBOARD_ROUTES.chats}?conversation=${conversationId}`;
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
              <Link href={DASHBOARD_ROUTES.integrations}>Connect a channel</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={buildConversationHref(conversation.id)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border px-3 py-3",
                  "transition-colors hover:bg-muted/40",
                )}
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
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
