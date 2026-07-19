import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRightIcon,
  MessageSquareTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_ROUTES } from "@/constants/routes";

type AuthPlatformShellProps = {
  title: string;
  description: string;
  eyebrow?: string;
  hideBrandMark?: boolean;
  children: ReactNode;
};

const platformSignals = [
  {
    icon: MessageSquareTextIcon,
    label: "Unified inbox",
    value: "Messages, calls, CRM, and bookings in one workspace",
  },
  {
    icon: SparklesIcon,
    label: "AI agent",
    value: "Replies with knowledge, memory, and handoff controls",
  },
  {
    icon: ShieldCheckIcon,
    label: "Human control",
    value: "Every automation stays reviewable and reversible",
  },
];

export function AuthPlatformShell({
  title,
  description,
  eyebrow,
  hideBrandMark = false,
  children,
}: AuthPlatformShellProps) {
  return (
    <div className="auth-shell-bg relative flex min-h-full flex-1 items-start justify-center overflow-x-hidden px-4 py-6 sm:items-center sm:px-6 sm:py-10">
      <div className="auth-shell-grid pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center">
        <section className="hidden min-h-[620px] flex-col justify-between rounded-lg border border-white/60 bg-white p-6 shadow-[0_28px_90px_rgba(24,24,27,0.08)] lg:flex">
          <div>
            <Link
              href={APP_ROUTES.home}
              className="inline-flex items-center gap-3 text-primary"
              aria-label="OrzuX home"
            >
              <BrandMark size={42} tone="on-light" priority />
              <BrandWordmark size="lg" />
            </Link>

            <p className="mt-10 text-xs font-semibold uppercase text-primary">
              Customer communication atelier
            </p>
            <h1 className="mt-4 max-w-2xl text-5xl font-semibold leading-[1.03] text-foreground">
              Enter a workspace shaped for fast replies and careful control.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
              Calm operations, visible AI, and a clean path from every
              conversation to booked revenue.
            </p>
          </div>

          <div className="grid gap-3">
            {platformSignals.map((signal) => {
              const Icon = signal.icon;

              return (
                <div
                  key={signal.label}
                  className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm"
                >
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      {signal.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {signal.value}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <Card className="flex w-full flex-col border-zinc-200 bg-white shadow-[0_30px_100px_rgba(24,24,27,0.1)] sm:min-h-[560px] lg:min-h-[620px]">
          <CardHeader className="space-y-2 px-5 pb-3 pt-5 text-center sm:px-6 sm:pt-6">
            {hideBrandMark ? null : (
              <div className="mx-auto mb-1 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20 sm:mb-2 sm:size-12">
                <BrandMark size={26} tone="on-dark" />
              </div>
            )}
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase text-primary sm:text-xs">
                {eyebrow}
              </p>
            ) : null}
            <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
            <CardDescription className="mx-auto max-w-sm text-sm leading-6">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="flex-1">{children}</div>
            <Link
              href={APP_ROUTES.home}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/70 hover:text-foreground sm:mt-5"
            >
              Back to welcome site
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
