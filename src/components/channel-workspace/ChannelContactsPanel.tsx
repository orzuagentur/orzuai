import Link from "next/link";
import { MessageSquare, Users } from "lucide-react";

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
  CHANNEL_WORKSPACE_MESSAGES,
  getChannelLabel,
} from "@/features/channel-workspace";
import { buildChannelWorkspaceHref } from "@/features/integrations";
import type { ChannelContactsData } from "@/types/channel-workspace.types";

type ChannelContactsPanelProps = {
  data: ChannelContactsData;
};

export function ChannelContactsPanel({ data }: ChannelContactsPanelProps) {
  const label = getChannelLabel(data.channel);

  if (!data.hasBusiness) {
    return null;
  }

  return (
    <Card className="max-w-3xl shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          <CardTitle>
            {label} — {CHANNEL_WORKSPACE_MESSAGES.contactsCount(data.total)}
          </CardTitle>
        </div>
        <CardDescription>
          {CHANNEL_WORKSPACE_MESSAGES.contactsEmptyHint}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {CHANNEL_WORKSPACE_MESSAGES.contactsEmpty}
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {data.contacts.map((contact) => (
              <li
                key={contact.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-muted-foreground">{contact.identifier}</p>
                </div>
                {contact.lastMessageAt ? (
                  <span className="text-xs text-muted-foreground">
                    {new Date(contact.lastMessageAt).toLocaleString("en-US")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {data.channel === "whatsapp" ? (
          <Button variant="outline" asChild>
            <Link href={DASHBOARD_ROUTES.chats}>
              <MessageSquare className="size-4" />
              {CHANNEL_WORKSPACE_MESSAGES.openChats}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link href={buildChannelWorkspaceHref(data.channel, "contacts")}>
              {CHANNEL_WORKSPACE_MESSAGES.openChats}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
