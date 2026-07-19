"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon, ChevronDownIcon, MenuIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { LandingIcon } from "@/components/landing/LandingIcon";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { OrzuLogo } from "@/components/landing/OrzuLogo";
import { Button } from "@/components/ui/button";
import {
  AUTH_ROUTES,
  DASHBOARD_ROUTES,
} from "@/constants/routes";
import { getChannelIconContainerClassName } from "@/features/chats/channel-ui";
import { getMarketplaceIntegrationChannels } from "@/features/integrations/channel-lists";
import {
  buildIntegrationActivateHref,
  type IntegrationChannelConfig,
} from "@/features/integrations/constants";
import type { LandingMegaPanel } from "@/features/landing/i18n";
import { LANDING_BOOK_DEMO } from "@/features/landing/constants";
import { cn } from "@/lib/utils";

type LandingHeaderProps = {
  onStartFree: () => void;
};

type MegaPanelKey = "products" | "services" | "solutions" | "resources";
type ContentMegaPanelKey = Exclude<MegaPanelKey, "services">;

type ServiceGroup = {
  title: string;
  items: IntegrationChannelConfig[];
};

const MEGA_PANEL_KEYS: MegaPanelKey[] = [
  "products",
  "services",
  "solutions",
  "resources",
];

const DIRECT_LINKS = [
  { key: "enterprise" as const, href: "#enterprise" },
  { key: "pricing" as const, href: "#pricing" },
];

const SERVICE_GROUP_DEFS: { title: string; ids: IntegrationChannelConfig["id"][] }[] = [
  {
    title: "Messaging",
    ids: ["whatsapp", "telegram", "website_chat", "email"],
  },
  {
    title: "Operations",
    ids: ["voice", "sms", "website_forms", "google_calendar"],
  },
];

const MARKETPLACE_SERVICE_GROUPS = buildMarketplaceServiceGroups();

function isContentMegaPanelKey(key: MegaPanelKey): key is ContentMegaPanelKey {
  return key !== "services";
}

function buildMarketplaceServiceGroups(): ServiceGroup[] {
  const byId = new Map(
    getMarketplaceIntegrationChannels().map((channel) => [channel.id, channel]),
  );

  return SERVICE_GROUP_DEFS.map((group) => ({
    title: group.title,
    items: group.ids
      .map((id) => byId.get(id))
      .filter((channel): channel is IntegrationChannelConfig => Boolean(channel)),
  })).filter((group) => group.items.length > 0);
}

export function LandingHeader({ onStartFree }: LandingHeaderProps) {
  const { copy } = useLandingLocale();
  const [activePanel, setActivePanel] = useState<MegaPanelKey | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const menuId = useId();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActivePanel(null);
        setMobileOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const setPanelWithDelay = useCallback((panel: MegaPanelKey | null) => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }

    if (panel) {
      setActivePanel(panel);
      return;
    }

    closeTimer.current = window.setTimeout(() => setActivePanel(null), 140);
  }, []);

  const closeNavigation = () => {
    setActivePanel(null);
    setMobileOpen(false);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-colors duration-300",
        scrolled || activePanel || mobileOpen
          ? "border-[var(--landing-line)] bg-white shadow-[0_1px_0_rgba(16,24,23,0.04)]"
          : "border-transparent bg-white",
      )}
      onMouseLeave={() => setPanelWithDelay(null)}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[72px]">
        <a href="#" aria-label="OrzuX home" onClick={closeNavigation}>
          <OrzuLogo align="left" tone="on-light" className="text-[var(--landing-ink)]" />
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {MEGA_PANEL_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              aria-expanded={activePanel === key}
              aria-controls={`${menuId}-${key}`}
              onMouseEnter={() => setPanelWithDelay(key)}
              onFocus={() => setPanelWithDelay(key)}
              onClick={() => setActivePanel(activePanel === key ? null : key)}
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium transition",
                activePanel === key
                  ? "bg-[var(--landing-primary)] text-white shadow-sm shadow-[var(--landing-primary)]/20"
                  : "text-[var(--landing-muted-text)] hover:bg-white/70 hover:text-[var(--landing-ink)]",
              )}
            >
              {copy.header.nav[key]}
              <ChevronDownIcon
                className={cn(
                  "size-3.5 transition-transform",
                  activePanel === key && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
          ))}

          {DIRECT_LINKS.map((item) => (
            <a
              key={item.key}
              href={item.href}
              onFocus={() => setPanelWithDelay(null)}
              className="rounded-full px-3 py-2 text-sm font-medium text-[var(--landing-muted-text)] transition hover:bg-white/70 hover:text-[var(--landing-ink)]"
            >
              {copy.header.nav[item.key]}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button
            variant="ghost"
            className="rounded-full text-[var(--landing-muted-text)] hover:bg-white/70 hover:text-[var(--landing-ink)]"
            asChild
          >
            <Link href={AUTH_ROUTES.login}>{copy.header.login}</Link>
          </Button>
          <Button
            type="button"
            variant="cta"
            size="cta"
            className="h-10 rounded-full bg-[var(--landing-primary)] px-5 text-sm text-white shadow-[0_12px_28px_rgba(18,60,53,0.18)] hover:bg-[#1d5148]"
            onClick={onStartFree}
          >
            {copy.header.startFree}
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--landing-line)] bg-white text-[var(--landing-ink)] shadow-sm lg:hidden"
          aria-label={mobileOpen ? copy.header.closeMenu : copy.header.openMenu}
          aria-expanded={mobileOpen}
          aria-controls={`${menuId}-mobile`}
          onClick={() => {
            setMobileOpen((open) => !open);
            setActivePanel(null);
          }}
        >
          {mobileOpen ? <XIcon className="size-4" /> : <MenuIcon className="size-4" />}
        </button>
      </div>

      <AnimatePresence>
        {activePanel ? (
          <motion.div
            key={activePanel}
            id={`${menuId}-${activePanel}`}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => setPanelWithDelay(activePanel)}
            className="absolute left-0 right-0 top-full hidden border-t border-[var(--landing-line)] bg-white shadow-[0_28px_90px_rgba(24,24,27,0.12)] lg:block"
          >
            {activePanel === "services" ? (
              <ServicesMegaPanel onNavigate={closeNavigation} />
            ) : isContentMegaPanelKey(activePanel) ? (
              <MegaPanel
                panel={copy.header.mega[activePanel]}
                onNavigate={closeNavigation}
              />
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            id={`${menuId}-mobile`}
            initial={reducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reducedMotion ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-[var(--landing-line)] bg-white lg:hidden"
          >
            <MobileNavigation onStartFree={onStartFree} onNavigate={closeNavigation} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function MegaPanel({
  panel,
  onNavigate,
}: {
  panel: LandingMegaPanel;
  onNavigate: () => void;
}) {
  const columnCount = Math.max(2, Math.min(3, panel.columns.length));

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-[1fr_280px] gap-8 px-6 py-7">
      <div>
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <p className="landing-eyebrow">{panel.title}</p>
            <p className="landing-copy mt-2 max-w-2xl text-sm leading-6">
              {panel.description}
            </p>
          </div>
          <a
            href={panel.featured.href}
            onClick={onNavigate}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            {panel.featured.cta}
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </a>
        </div>

        <div
          className={cn(
            "grid gap-4",
            columnCount === 3 ? "md:grid-cols-3" : "md:grid-cols-2",
          )}
        >
          {panel.columns.map((column) => (
            <div key={column.title} className="flex h-full flex-col gap-2">
              <p className="px-1 text-xs font-semibold uppercase text-[var(--landing-muted-text)]">
                {column.title}
              </p>
              <div className="grid flex-1 gap-2">
                {column.items.map((item) => (
                  <a
                    key={item.title}
                    href={item.href}
                    onClick={onNavigate}
                    className="group flex min-h-[92px] gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
                  >
                    <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
                      <LandingIcon icon={item.icon} className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--landing-ink)]">
                        {item.title}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[var(--landing-muted-text)]">
                        {item.description}
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <a
        href={panel.featured.href}
        onClick={onNavigate}
        className="flex min-h-[260px] flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 text-[var(--landing-ink)] shadow-sm transition hover:border-zinc-300 hover:shadow-md"
      >
        <span>
          <span className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
            <LandingIcon icon="spark" className="size-5" />
          </span>
          <span className="mt-5 block text-lg font-semibold leading-6">
            {panel.featured.title}
          </span>
          <span className="mt-3 block text-sm leading-6 text-[var(--landing-muted-text)]">
            {panel.featured.description}
          </span>
        </span>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-zinc-900">
          {panel.featured.cta}
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </span>
      </a>
    </div>
  );
}

function ServicesMegaPanel({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-[1fr_280px] gap-8 px-6 py-7">
      <div>
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <p className="landing-eyebrow">Services</p>
            <p className="landing-copy mt-2 max-w-2xl text-sm leading-6">
              Channels and service connections from the Integrations Marketplace.
            </p>
          </div>
          <a
            href={DASHBOARD_ROUTES.marketplace}
            onClick={onNavigate}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Open marketplace
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </a>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {MARKETPLACE_SERVICE_GROUPS.map((group) => (
            <div key={group.title} className="flex h-full flex-col gap-2">
              <p className="px-1 text-xs font-semibold uppercase text-[var(--landing-muted-text)]">
                {group.title}
              </p>
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                {group.items.map((service) => (
                  <MarketplaceServiceLink
                    key={service.id}
                    service={service}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <a
        href={DASHBOARD_ROUTES.marketplace}
        onClick={onNavigate}
        className="flex min-h-[260px] flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 text-[var(--landing-ink)] shadow-sm transition hover:border-zinc-300 hover:shadow-md"
      >
        <span>
          <span className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
            <LandingIcon icon="integrations" className="size-5" />
          </span>
          <span className="mt-5 block text-lg font-semibold leading-6">
            Integration catalog
          </span>
          <span className="mt-3 block text-sm leading-6 text-[var(--landing-muted-text)]">
            Open the same catalog your workspace uses for channel setup and
            service connections.
          </span>
        </span>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-zinc-900">
          Open marketplace
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </span>
      </a>
    </div>
  );
}

function MarketplaceServiceLink({
  service,
  onNavigate,
}: {
  service: IntegrationChannelConfig;
  onNavigate: () => void;
}) {
  const Icon = service.icon;

  return (
    <a
      href={buildIntegrationActivateHref(service.id)}
      onClick={onNavigate}
      className="group flex min-h-[92px] gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
    >
      <span
        className={cn(
          "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200",
          getChannelIconContainerClassName(service.id),
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--landing-ink)]">
          {service.label}
        </span>
        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[var(--landing-muted-text)]">
          {service.description}
        </span>
      </span>
    </a>
  );
}

function MobileMarketplaceServices({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-3">
      {MARKETPLACE_SERVICE_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-2 py-1 text-[11px] font-semibold uppercase text-[var(--landing-muted-text)]">
            {group.title}
          </p>
          {group.items.map((service) => {
            const Icon = service.icon;

            return (
              <a
                key={service.id}
                href={buildIntegrationActivateHref(service.id)}
                onClick={onNavigate}
                className="flex gap-3 rounded-lg px-2 py-3 transition hover:bg-[var(--landing-soft)]"
              >
                <span
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--landing-line)]",
                    getChannelIconContainerClassName(service.id),
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[var(--landing-ink)]">
                    {service.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-[var(--landing-muted-text)]">
                    {service.description}
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MobileNavigation({
  onStartFree,
  onNavigate,
}: {
  onStartFree: () => void;
  onNavigate: () => void;
}) {
  const { copy } = useLandingLocale();

  return (
    <div className="space-y-5 px-4 py-5">
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="ghost"
          className="rounded-full text-[var(--landing-muted-text)] hover:bg-[var(--landing-soft)] hover:text-[var(--landing-ink)]"
          asChild
        >
          <Link href={AUTH_ROUTES.login}>{copy.header.login}</Link>
        </Button>
      </div>

      <div className="space-y-2">
        {MEGA_PANEL_KEYS.map((key) => {
          return (
            <details
              key={key}
              className="group rounded-lg border border-[var(--landing-line)] bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--landing-ink)] marker:content-none [&::-webkit-details-marker]:hidden">
                {copy.header.nav[key]}
                <ChevronDownIcon
                  className="size-4 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="border-t border-[var(--landing-line)] px-3 py-2">
                {key === "services" ? (
                  <MobileMarketplaceServices onNavigate={onNavigate} />
                ) : isContentMegaPanelKey(key) ? (
                  copy.header.mega[key].columns
                    .flatMap((column) => column.items)
                    .map((item) => (
                      <a
                        key={item.title}
                        href={item.href}
                        onClick={onNavigate}
                        className="flex gap-3 rounded-lg px-2 py-3 transition hover:bg-[var(--landing-soft)]"
                      >
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--landing-line)] bg-[var(--landing-soft)] text-[var(--landing-teal)]">
                          <LandingIcon icon={item.icon} className="size-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-[var(--landing-ink)]">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-[var(--landing-muted-text)]">
                            {item.description}
                          </span>
                        </span>
                      </a>
                    ))
                ) : null}
              </div>
            </details>
          );
        })}

        {DIRECT_LINKS.map((item) => (
          <a
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            className="block rounded-lg border border-[var(--landing-line)] bg-white/82 px-4 py-3 text-sm font-semibold text-[var(--landing-ink)]"
          >
            {copy.header.nav[item.key]}
          </a>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          className="h-11 rounded-full bg-[var(--landing-primary)] text-white hover:bg-[#1d5148]"
          onClick={() => {
            onStartFree();
            onNavigate();
          }}
        >
          {copy.header.startFree}
        </Button>
        <Button
          variant="outline"
          className="h-11 rounded-full border-[var(--landing-line)] bg-white text-[var(--landing-ink)] hover:bg-[var(--landing-soft)]"
          asChild
        >
          <a href={LANDING_BOOK_DEMO.href} onClick={onNavigate}>
            {copy.header.bookDemo}
          </a>
        </Button>
      </div>
    </div>
  );
}
