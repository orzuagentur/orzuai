import { Badge } from "@/components/ui/badge";
import {
  INTEGRATIONS_MESSAGES,
  type IntegrationChannelStatusEntry,
} from "@/features/integrations";

type ChannelStatusBadgeProps = {
  entry: IntegrationChannelStatusEntry;
};

export function ChannelStatusBadge({ entry }: ChannelStatusBadgeProps) {
  if (entry.status === "connected") {
    return (
      <Badge
        variant="outline"
        className="shrink-0 border-success/30 bg-success/10 text-[10px] text-success"
      >
        {INTEGRATIONS_MESSAGES.statusConnected}
      </Badge>
    );
  }

  if (entry.status === "pending") {
    return (
      <Badge
        variant="outline"
        className="shrink-0 border-warning/30 bg-warning/10 text-[10px] text-warning"
      >
        {INTEGRATIONS_MESSAGES.statusPending}
      </Badge>
    );
  }

  if (entry.status === "coming_soon") {
    return (
      <Badge variant="outline" className="shrink-0 text-[10px]">
        {INTEGRATIONS_MESSAGES.statusComingSoon}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="shrink-0 text-[10px]">
      {INTEGRATIONS_MESSAGES.statusDisconnected}
    </Badge>
  );
}
