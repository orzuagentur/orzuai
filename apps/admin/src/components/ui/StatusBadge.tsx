import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
};

const toneClasses = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  danger: "bg-destructive/15 text-destructive",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
};

export function StatusBadge({
  label,
  tone = "default",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
