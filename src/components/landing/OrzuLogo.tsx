import { BrandMark } from "@/components/brand/BrandMark";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
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
        <BrandWordmark size={size === "lg" ? "lg" : "md"} />
      ) : null}
    </div>
  );
}
