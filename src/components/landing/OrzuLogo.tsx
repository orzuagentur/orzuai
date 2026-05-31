import { BrandMark } from "@/components/brand/BrandMark";
import { BRAND_NAME, BRAND_TAGLINE } from "@/constants/brand";
import { cn } from "@/lib/utils";

type OrzuLogoProps = {
  className?: string;
  showWordmark?: boolean;
  size?: "default" | "lg";
  align?: "left" | "center";
};

export function OrzuLogo({
  className,
  showWordmark = true,
  size = "default",
  align = "left",
}: OrzuLogoProps) {
  const markSize = size === "lg" ? 56 : 44;

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        align === "center" && "flex-col text-center",
        className,
      )}
    >
      <BrandMark size={markSize} priority />
      {showWordmark ? (
        <div className={align === "center" ? "text-center" : "text-left"}>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            {BRAND_NAME}
          </p>
          <p className="text-xs text-muted-foreground">{BRAND_TAGLINE}</p>
        </div>
      ) : null}
    </div>
  );
}
