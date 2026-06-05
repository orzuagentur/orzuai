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
import { BotIcon } from "lucide-react";

type AiStatusCardProps = {
  aiEnabled: boolean | null;
};

export function AiStatusCard({ aiEnabled }: AiStatusCardProps) {
  const isEnabled = aiEnabled === true;
  const isConfigured = aiEnabled !== null;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BotIcon className="size-4 text-primary" />
          AI Status
        </CardTitle>
        <CardDescription>
          Automated replies across WhatsApp, Instagram, Telegram, and more.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge variant={isEnabled ? "default" : "secondary"}>
          {isEnabled ? "Enabled" : "Disabled"}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {isConfigured
            ? isEnabled
              ? "Your AI assistant is actively responding to customer messages."
              : "AI auto-replies are turned off. Enable them in AI Assistant settings."
            : "Configure your AI assistant to start automating responses."}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={`${DASHBOARD_ROUTES.aiAssistant}?channel=whatsapp`}>
            Configure AI
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
