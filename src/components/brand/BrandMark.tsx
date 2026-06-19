import Image from "next/image";

import {
  BRAND_ICON_LIGHT_PATH,
  BRAND_ICON_PATH,
  BRAND_NAME,
} from "@/constants/brand";
import { cn } from "@/lib/utils";

type BrandMarkTone = "auto" | "on-dark" | "on-light";

type BrandMarkProps = {
  className?: string;
  size?: number;
  priority?: boolean;
  tone?: BrandMarkTone;
};

function usesCssDimensions(className?: string): boolean {
  if (!className) {
    return false;
  }

  return /\b(size-|w-|h-|min-|max-)/.test(className);
}

function renderMarkImage(
  src: string,
  alt: string,
  size: number,
  priority: boolean,
  hiddenClass?: string,
) {
  return (
    <Image
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      width={size}
      height={size}
      priority={priority}
      className={cn("h-full w-full object-contain", hiddenClass)}
    />
  );
}

export function BrandMark({
  className,
  size = 44,
  priority = false,
  tone = "auto",
}: BrandMarkProps) {
  const wrapperClass = cn("relative inline-flex shrink-0", className);
  const wrapperStyle = usesCssDimensions(className)
    ? undefined
    : { width: size, height: size };

  if (tone === "on-dark") {
    return (
      <span className={wrapperClass} style={wrapperStyle}>
        {renderMarkImage(
          BRAND_ICON_PATH,
          `${BRAND_NAME} logo`,
          size,
          priority,
        )}
      </span>
    );
  }

  if (tone === "on-light") {
    return (
      <span className={wrapperClass} style={wrapperStyle}>
        {renderMarkImage(
          BRAND_ICON_LIGHT_PATH,
          `${BRAND_NAME} logo`,
          size,
          priority,
        )}
      </span>
    );
  }

  return (
    <span className={wrapperClass} style={wrapperStyle}>
      {renderMarkImage(
        BRAND_ICON_LIGHT_PATH,
        `${BRAND_NAME} logo`,
        size,
        priority,
        "dark:hidden",
      )}
      {renderMarkImage(BRAND_ICON_PATH, "", size, priority, "hidden dark:block")}
    </span>
  );
}
