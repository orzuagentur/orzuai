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
        "inline-flex items-baseline truncate font-medium tracking-[0.12em] text-inherit uppercase",
        sizeClass,
        className,
      )}
    >
      <span className="font-semibold">Orzu</span>
      <span
        className={cn(
          "relative -ml-0.5 inline-block font-black leading-none",
          "bg-gradient-to-br from-emerald-500 via-cyan-500 to-sky-500 bg-clip-text text-transparent",
          size === "lg"
            ? "text-[1.55em] -translate-y-[0.06em]"
            : size === "sm"
              ? "text-[1.45em] -translate-y-[0.04em]"
              : "text-[1.5em] -translate-y-[0.05em]",
        )}
      >
        X
      </span>
    </span>
  );
}
