import { cn } from "@/lib/utils";

type DashboardPageHeadingProps = {
  title: string;
  compact?: boolean;
  className?: string;
};

export function DashboardPageHeading({
  title,
  compact = false,
  className,
}: DashboardPageHeadingProps) {
  return (
    <div
      className={cn(
        "min-w-0 shrink-0",
        compact
          ? "max-w-[9rem] sm:max-w-[11rem] md:max-w-xs"
          : "max-w-[10rem] sm:max-w-sm md:max-w-md lg:max-w-lg",
        className,
      )}
    >
      <p className="truncate text-base font-semibold leading-tight sm:text-lg">
        {title}
      </p>
    </div>
  );
}
