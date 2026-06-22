import { cn } from "@/lib/utils";

/** Subtle active state — muted gray, no primary/violet rings (matches CRM header tabs). */
export function getNavSegmentActiveClassName(isActive: boolean): string {
  return cn(
    isActive
      ? "bg-muted/55 text-foreground font-medium"
      : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
  );
}

export function getChannelRailIconShellClassName(
  isActive: boolean,
  surfaceClassName?: string,
): string {
  return cn(
    "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-200",
    isActive
      ? "bg-muted/65 dark:bg-muted/45"
      : surfaceClassName ?? "bg-muted/20",
  );
}

export function getChannelRailFavoritesShellClassName(isActive: boolean): string {
  return getChannelRailIconShellClassName(isActive);
}

export function getChannelRailRowClassName(isActive: boolean): string {
  return cn(
    "relative flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 text-center transition-colors xl:flex-row xl:gap-2 xl:px-1.5 xl:py-2.5 xl:text-left",
    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/85",
  );
}

export const CHANNEL_RAIL_NAV_CLASS =
  "flex h-full min-h-0 w-full flex-col gap-0.5 overflow-y-auto px-1.5 py-2";

export const CHANNEL_RAIL_ASIDE_CLASS =
  "flex w-[4.75rem] min-h-0 shrink-0 flex-col overflow-hidden border-r bg-muted/15 xl:w-40";

export const CHANNEL_RAIL_COLLAPSED_CLASS =
  "flex w-5 min-h-0 shrink-0 flex-col items-center border-r bg-muted/15 pt-2";

export const CHANNEL_RAIL_TOGGLE_CLASS = "[&_svg]:size-4 [&_svg]:stroke-[3]";

export const CHANNEL_RAIL_MESSAGES = {
  expand: "Show channels",
  collapse: "Hide channels",
} as const;
