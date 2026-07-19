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
        "inline-flex items-baseline truncate font-medium text-inherit uppercase",
        sizeClass,
        className,
      )}
    >
      <span className="font-semibold">Orzu</span>
      <span
        className={cn(
          "relative -ml-0.5 inline-block font-black leading-none",
          "bg-gradient-to-br from-zinc-800 via-zinc-600 to-zinc-400 bg-clip-text text-transparent dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-500",
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
