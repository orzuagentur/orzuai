import { DASHBOARD_ROUTES } from "@/constants/routes";
import { getChannelLabel } from "@/features/channel-workspace/constants";
import {
  DASHBOARD_AI_NAV_ITEMS,
  DASHBOARD_NAV_ITEMS,
} from "@/features/dashboard/constants";

export function resolveDashboardPageTitle(pathname: string): string {
  if (pathname === DASHBOARD_ROUTES.overview) {
    return "Home";
  }

  if (pathname === DASHBOARD_ROUTES.onboarding) {
    return "Setup";
  }

  for (const item of DASHBOARD_AI_NAV_ITEMS) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.label;
    }
  }

  for (const item of DASHBOARD_NAV_ITEMS) {
    if (pathname === item.href) {
      return item.label;
    }

    if (!pathname.startsWith(`${item.href}/`)) {
      continue;
    }

    const remainder = pathname.slice(item.href.length + 1);
    const segment = remainder.split("/")[0]?.split("?")[0];

    if (!segment) {
      return item.label;
    }

    if (item.id === "chats" || item.id === "integrations") {
      return getChannelLabel(segment);
    }

    return item.label;
  }

  return "OrzuX";
}
