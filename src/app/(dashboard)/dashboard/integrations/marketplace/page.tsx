import Link from "next/link";
import { ArrowRightIcon, StoreIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { MARKETPLACE_APPS } from "@/features/integrations/marketplace-catalog";

export default function IntegrationsMarketplacePage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <StoreIcon className="size-6" />
            Integrations Marketplace
          </h1>
          <p className="text-sm text-muted-foreground">
            Discover apps to connect messaging, CRM, payments, and automation.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={DASHBOARD_ROUTES.integrations}>Back to channels</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MARKETPLACE_APPS.map((app) => (
          <div
            key={app.id}
            className="flex flex-col rounded-xl border bg-card p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{app.name}</p>
                <p className="text-xs text-muted-foreground">{app.category}</p>
              </div>
              <Badge
                variant={
                  app.status === "available"
                    ? "default"
                    : app.status === "beta"
                      ? "secondary"
                      : "outline"
                }
              >
                {app.status === "coming_soon" ? "Coming soon" : app.status}
              </Badge>
            </div>
            <p className="mt-3 flex-1 text-sm text-muted-foreground">
              {app.description}
            </p>
            {app.href ? (
              <Link
                href={app.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
              >
                Connect
                <ArrowRightIcon className="size-4" />
              </Link>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Notify me — soon</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
