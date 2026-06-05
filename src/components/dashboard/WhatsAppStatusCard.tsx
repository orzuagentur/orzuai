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
import { buildIntegrationActivateHref } from "@/features/integrations";
import type { WhatsappStatus } from "@/types/database.types";
import { PhoneIcon } from "lucide-react";

type WhatsAppStatusCardProps = {
  status: WhatsappStatus | null;
  phoneNumber: string | null;
};

function getStatusLabel(status: WhatsappStatus | null): string {
  if (!status) {
    return "Not connected";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getStatusVariant(
  status: WhatsappStatus | null,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "connected") {
    return "default";
  }

  if (status === "pending") {
    return "secondary";
  }

  return "outline";
}

export function WhatsAppStatusCard({
  status,
  phoneNumber,
}: WhatsAppStatusCardProps) {
  const isConnected = status === "connected";

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PhoneIcon className="size-4 text-primary" />
          WhatsApp Status
        </CardTitle>
        <CardDescription>
          Connection status for your business WhatsApp number.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge variant={getStatusVariant(status)}>{getStatusLabel(status)}</Badge>
        <p className="text-sm text-muted-foreground">
          {phoneNumber
            ? `Connected number: ${phoneNumber}`
            : "No WhatsApp number connected yet."}
        </p>
        <Button asChild variant={isConnected ? "outline" : "default"} size="sm">
          <Link href={buildIntegrationActivateHref("whatsapp")}>
            {isConnected ? "Manage connection" : "Connect WhatsApp"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
