import { BrandMark } from "@/components/brand/BrandMark";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { cn } from "@/lib/utils";

type OrzuLogoProps = {
  className?: string;
  showWordmark?: boolean;
  size?: "default" | "lg";
  align?: "left" | "center";
  tone?: "auto" | "on-dark" | "on-light";
};

export function OrzuLogo({
  className,
  showWordmark = true,
  size = "default",
  align = "left",
  tone = "on-dark",
}: OrzuLogoProps) {
  const markSize = size === "lg" ? 56 : 44;

  return (
    <div
      className={cn(
        "flex items-center gap-3 text-inherit",
        align === "center" && "flex-col text-center",
        className,
      )}
    >
      <BrandMark size={markSize} priority tone={tone} />
      {showWordmark ? (
        <BrandWordmark size={size === "lg" ? "lg" : "md"} />
      ) : null}
    </div>
  );
}
