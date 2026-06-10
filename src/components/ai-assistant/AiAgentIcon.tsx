import { getAgentIconDefinition } from "@/features/ai-assistant/agent-icons";
import { cn } from "@/lib/utils";

type AiAgentIconProps = {
  iconId: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
  iconClassName?: string;
};

const sizeClasses = {
  sm: "size-8 rounded-lg",
  md: "size-11 rounded-xl",
  lg: "size-14 rounded-2xl",
} as const;

const iconSizeClasses = {
  sm: "size-4",
  md: "size-5",
  lg: "size-7",
} as const;

export function AiAgentIcon({
  iconId,
  size = "md",
  className,
  iconClassName,
}: AiAgentIconProps) {
  const definition = getAgentIconDefinition(iconId);
  const Icon = definition.icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-primary/10 text-primary",
        sizeClasses[size],
        className,
      )}
      title={definition.label}
    >
      <Icon className={cn(iconSizeClasses[size], iconClassName)} aria-hidden />
    </span>
  );
}
