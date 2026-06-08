import { cn } from "@/lib/utils";

type BrandWordmarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function BrandWordmark({ className, size = "md" }: BrandWordmarkProps) {
  const sizeClass =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-[15px]";

  return (
    <span
      className={cn(
        "truncate font-semibold tracking-[0.14em] text-foreground uppercase",
        sizeClass,
        className,
      )}
    >
      Orzu<span className="font-bold tracking-[0.2em]">X</span>
    </span>
  );
}
