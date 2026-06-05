import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getChannelLabel } from "@/features/channel-workspace/constants";
import { DASHBOARD_NAV_ITEMS } from "@/features/dashboard/constants";

export type DashboardBreadcrumb = {
  label: string;
  href?: string;
};

export function resolveDashboardBreadcrumbs(
  pathname: string,
): DashboardBreadcrumb[] {
  if (pathname === DASHBOARD_ROUTES.overview) {
    return [{ label: "Home" }];
  }

  if (pathname === DASHBOARD_ROUTES.onboarding) {
    return [{ label: "Setup" }];
  }

  for (const item of DASHBOARD_NAV_ITEMS) {
    if (pathname === item.href) {
      return [{ label: item.label }];
    }

    if (!pathname.startsWith(`${item.href}/`)) {
      continue;
    }

    const remainder = pathname.slice(item.href.length + 1);
    const segment = remainder.split("/")[0]?.split("?")[0];

    if (!segment) {
      return [{ label: item.label }];
    }

    const childLabel =
      item.id === "chats" || item.id === "integrations"
        ? getChannelLabel(segment)
        : item.label;

    return [
      { label: item.label, href: item.href },
      { label: childLabel },
    ];
  }

  return [{ label: "OrzuAI" }];
}
