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
            Latest WhatsApp chats with your customers.
          </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={DASHBOARD_ROUTES.chats}>View all</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No conversations yet. Connect WhatsApp to start receiving
            messages.
          </p>
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
