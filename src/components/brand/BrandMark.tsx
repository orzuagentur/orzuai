import Image from "next/image";

import { BRAND_ICON_PATH, BRAND_NAME } from "@/constants/brand";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  size?: number;
  priority?: boolean;
};

export function BrandMark({
  className,
  size = 44,
  priority = false,
}: BrandMarkProps) {
  return (
    <Image
      src={BRAND_ICON_PATH}
      alt={`${BRAND_NAME} logo`}
      width={size}
      height={size}
      priority={priority}
      className={cn("object-contain", className)}
    />
  );
}
