import Image from "next/image";

import { cn } from "@/lib/utils";

const AI_ASSISTANT_ICON_PATH = "/ai-assistant-icon.png";

type AiAssistantIconProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function AiAssistantIcon({
  size = 40,
  className,
  priority = false,
}: AiAssistantIconProps) {
  return (
    <Image
      src={AI_ASSISTANT_ICON_PATH}
      alt="AI Assistant"
      width={size}
      height={size}
      priority={priority}
      className={cn("object-contain", className)}
    />
  );
}
