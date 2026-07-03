"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon, ChevronDownIcon, MenuIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { LandingIcon } from "@/components/landing/LandingIcon";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { OrzuLogo } from "@/components/landing/OrzuLogo";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES, DASHBOARD_ROUTES } from "@/constants/routes";
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

type MegaPanelKey =
  | "products"
  | "services"
  | "solutions"
  | "developers"
  | "resources";
type ContentMegaPanelKey = Exclude<MegaPanelKey, "services">;

type ServiceGroup = {
  title: string;
  items: IntegrationChannelConfig[];
};

const MEGA_PANEL_KEYS: MegaPanelKey[] = [
  "products",
  "services",
  "solutions",
  "developers",
  "resources",
];

const DIRECT_LINKS = [
  { key: "enterprise" as const, href: "#enterprise" },
  { key: "pricing" as const, href: "#pricing" },
  { key: "documentation" as const, href: "#architecture" },
];

const SERVICE_CATEGORY_ORDER = [
  "Messaging",
  "Lead capture",
  "Voice",
  "Email",
  "Calendar",
];

const MARKETPLACE_SERVICE_GROUPS = buildMarketplaceServiceGroups();

function isContentMegaPanelKey(key: MegaPanelKey): key is ContentMegaPanelKey {
  return key !== "services";
}

function buildMarketplaceServiceGroups(): ServiceGroup[] {
  const groups = new Map<string, IntegrationChannelConfig[]>();

  for (const channel of getMarketplaceIntegrationChannels()) {
    const category = channel.category.trim() || "Other services";
    const current = groups.get(category) ?? [];
    current.push(channel);
    groups.set(category, current);
  }

  return Array.from(groups, ([title, items]) => ({ title, items })).sort(
    (left, right) => {
      const leftIndex = SERVICE_CATEGORY_ORDER.indexOf(left.title);
      const rightIndex = SERVICE_CATEGORY_ORDER.indexOf(right.title);

      if (leftIndex === -1 && rightIndex === -1) {
        return left.title.localeCompare(right.title);
      }

      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;

      return leftIndex - rightIndex;
    },
  );
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
          ? "border-[#d9e3dc] bg-[#f7f9f6]/92 shadow-[0_1px_0_rgba(19,32,26,0.03)] backdrop-blur-xl"
          : "border-transparent bg-[#f7f9f6]/74 backdrop-blur-md",
      )}
      onMouseLeave={() => setPanelWithDelay(null)}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[72px]">
        <a href="#" aria-label="OrzuX home" onClick={closeNavigation}>
          <OrzuLogo align="left" tone="on-light" className="text-[#111815]" />
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
                  ? "bg-[#111815] text-white"
                  : "text-[#4d5a53] hover:bg-[#e9eee9] hover:text-[#111815]",
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
              className="rounded-full px-3 py-2 text-sm font-medium text-[#4d5a53] transition hover:bg-[#e9eee9] hover:text-[#111815]"
            >
              {copy.header.nav[item.key]}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button
            variant="ghost"
            className="rounded-full text-[#4d5a53] hover:bg-[#e9eee9] hover:text-[#111815]"
            asChild
          >
            <Link href={AUTH_ROUTES.login}>{copy.header.login}</Link>
          </Button>
          <Button
            type="button"
            variant="cta"
            size="cta"
            className="h-10 rounded-full bg-[#111815] px-5 text-sm text-white shadow-none hover:bg-[#24332c]"
            onClick={onStartFree}
          >
            {copy.header.startFree}
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full border border-[#d9e3dc] bg-white text-[#111815] lg:hidden"
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
            className="absolute left-0 right-0 top-full hidden border-t border-[#d9e3dc] bg-[#fbfcfa]/96 shadow-[0_24px_80px_rgba(24,36,30,0.12)] backdrop-blur-2xl lg:block"
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
            className="overflow-hidden border-t border-[#d9e3dc] bg-[#fbfcfa] lg:hidden"
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
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-[1fr_280px] gap-8 px-6 py-7">
      <div>
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6a756f]">
              {panel.title}
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4d5a53]">
              {panel.description}
            </p>
          </div>
          <a
            href={panel.featured.href}
            onClick={onNavigate}
            className="inline-flex items-center gap-2 rounded-full bg-[#111815] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#24332c]"
          >
            {panel.featured.cta}
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </a>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {panel.columns.map((column) => (
            <div key={column.title} className="space-y-2">
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#7b8780]">
                {column.title}
              </p>
              {column.items.map((item) => (
                <a
                  key={item.title}
                  href={item.href}
                  onClick={onNavigate}
                  className="group flex gap-3 rounded-lg p-2.5 transition hover:bg-[#edf3ef]"
                >
                  <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#d6e1da] bg-white text-[#1e6f5c]">
                    <LandingIcon icon={item.icon} className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[#111815]">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[#607069]">
                      {item.description}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>

      <a
        href={panel.featured.href}
        onClick={onNavigate}
        className="flex min-h-[260px] flex-col justify-between rounded-lg border border-[#d9e3dc] bg-[#101815] p-5 text-white transition hover:bg-[#16241f]"
      >
        <span>
          <span className="inline-flex size-10 items-center justify-center rounded-lg bg-white/10">
            <LandingIcon icon="spark" className="size-5" />
          </span>
          <span className="mt-5 block text-lg font-semibold leading-6">
            {panel.featured.title}
          </span>
          <span className="mt-3 block text-sm leading-6 text-white/62">
            {panel.featured.description}
          </span>
        </span>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6a756f]">
              Services
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4d5a53]">
              Channels and service connections loaded from the Integrations
              Marketplace.
            </p>
          </div>
          <a
            href={DASHBOARD_ROUTES.marketplace}
            onClick={onNavigate}
            className="inline-flex items-center gap-2 rounded-full bg-[#111815] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#24332c]"
          >
            Open marketplace
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </a>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {MARKETPLACE_SERVICE_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2">
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#7b8780]">
                {group.title}
              </p>
              {group.items.map((service) => (
                <MarketplaceServiceLink
                  key={service.id}
                  service={service}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <a
        href={DASHBOARD_ROUTES.marketplace}
        onClick={onNavigate}
        className="flex min-h-[260px] flex-col justify-between rounded-lg border border-[#d9e3dc] bg-[#101815] p-5 text-white transition hover:bg-[#16241f]"
      >
        <span>
          <span className="inline-flex size-10 items-center justify-center rounded-lg bg-white/10">
            <LandingIcon icon="integrations" className="size-5" />
          </span>
          <span className="mt-5 block text-lg font-semibold leading-6">
            Integration catalog
          </span>
          <span className="mt-3 block text-sm leading-6 text-white/62">
            Open the same catalog your workspace uses for channel setup and
            service connections.
          </span>
        </span>
        <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
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
      className="group flex gap-3 rounded-lg p-2.5 transition hover:bg-[#edf3ef]"
    >
      <span
        className={cn(
          "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#d6e1da]",
          getChannelIconContainerClassName(service.id),
        )}
      >
        <Icon className="size-4" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-[#111815]">
          {service.label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[#607069]">
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
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b8780]">
            {group.title}
          </p>
          {group.items.map((service) => {
            const Icon = service.icon;

            return (
              <a
                key={service.id}
                href={buildIntegrationActivateHref(service.id)}
                onClick={onNavigate}
                className="flex gap-3 rounded-lg px-2 py-3 transition hover:bg-[#f2f6f3]"
              >
                <span
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#d6e1da]",
                    getChannelIconContainerClassName(service.id),
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#111815]">
                    {service.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-[#607069]">
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
          className="rounded-full text-[#4d5a53] hover:bg-[#e9eee9] hover:text-[#111815]"
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
              className="group rounded-lg border border-[#d9e3dc] bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[#111815] marker:content-none [&::-webkit-details-marker]:hidden">
                {copy.header.nav[key]}
                <ChevronDownIcon
                  className="size-4 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="border-t border-[#edf1ee] px-3 py-2">
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
                        className="flex gap-3 rounded-lg px-2 py-3 transition hover:bg-[#f2f6f3]"
                      >
                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#d6e1da] bg-[#f7f9f6] text-[#1e6f5c]">
                          <LandingIcon icon={item.icon} className="size-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-[#111815]">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-[#607069]">
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
            className="block rounded-lg border border-[#d9e3dc] bg-white px-4 py-3 text-sm font-semibold text-[#111815]"
          >
            {copy.header.nav[item.key]}
          </a>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          className="h-11 rounded-full bg-[#111815] text-white hover:bg-[#24332c]"
          onClick={() => {
            onStartFree();
            onNavigate();
          }}
        >
          {copy.header.startFree}
        </Button>
        <Button
          variant="outline"
          className="h-11 rounded-full border-[#d9e3dc] bg-white text-[#111815] hover:bg-[#f2f6f3]"
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
