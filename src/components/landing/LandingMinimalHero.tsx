"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRightIcon,
  CalendarCheckIcon,
  CheckCircle2Icon,
  PhoneCallIcon,
  SendIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { ChannelBrandIcon, type ChannelBrandId } from "@/components/icons/channel-brand-icons";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { Button } from "@/components/ui/button";
import { LANDING_BOOK_DEMO } from "@/features/landing/constants";
import type { LandingLiveEvent } from "@/features/landing/i18n";
import { cn } from "@/lib/utils";

type LandingMinimalHeroProps = {
  onStartFree: () => void;
};

export function LandingMinimalHero({ onStartFree }: LandingMinimalHeroProps) {
  const { copy } = useLandingLocale();

  return (
    <section
      id="live-platform"
      className="relative isolate w-full overflow-hidden px-4 pb-14 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:pb-20"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-xs font-semibold uppercase text-[#1e6f5c]"
          >
            {copy.hero.eyebrow}
          </motion.p>
          <motion.h1
            id="hero-heading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.42 }}
            className="mt-4 text-4xl font-semibold leading-[1.04] text-[#101815] sm:text-5xl lg:text-6xl"
          >
            {copy.hero.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.42 }}
            className="mx-auto mt-4 max-w-3xl text-base leading-7 text-[#52625a] sm:text-lg sm:leading-8"
          >
            {copy.hero.subtitle}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.42 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-3"
          >
            <Button
              type="button"
              variant="cta"
              size="cta"
              className="h-12 rounded-full bg-[#111815] px-6 text-white shadow-none hover:bg-[#24332c]"
              onClick={onStartFree}
            >
              {copy.hero.primaryCta}
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="cta"
              className="h-12 rounded-full border-[#d6e1da] bg-white px-6 text-[#111815] shadow-none hover:bg-[#edf3ef]"
              asChild
            >
              <a href={LANDING_BOOK_DEMO.href}>{copy.hero.secondaryCta}</a>
            </Button>
          </motion.div>
        </div>

        <LivePlatformSurface />

        <div className="mx-auto mt-8 grid max-w-4xl gap-2 sm:grid-cols-3">
          {copy.hero.metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-lg border border-[#d9e3dc] bg-white/78 px-4 py-3 text-center shadow-[0_1px_0_rgba(24,36,30,0.04)]"
            >
              <p className="text-2xl font-semibold text-[#111815]">{metric.value}</p>
              <p className="mt-1 text-xs font-medium uppercase text-[#66746d]">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LivePlatformSurface() {
  const { copy } = useLandingLocale();
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const events = copy.liveDemo.events;
  const activeEvent = events[activeIndex % events.length] ?? events[0]!;

  useEffect(() => {
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setActiveIndex((value) => (value + 1) % events.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, [events.length, reducedMotion]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto mt-8 max-w-7xl"
    >
      <div
        className="overflow-hidden rounded-lg border border-[#1e2d27] bg-[#101815] shadow-[0_28px_90px_rgba(23,38,30,0.28)]"
        role="img"
        aria-label={copy.liveDemo.subtitle}
      >
        <div className="flex h-11 items-center justify-between border-b border-white/10 bg-[#121d18] px-4">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#f36c5b]" aria-hidden="true" />
            <span className="size-2.5 rounded-full bg-[#f2c94c]" aria-hidden="true" />
            <span className="size-2.5 rounded-full bg-[#35c482]" aria-hidden="true" />
          </div>
          <div className="hidden items-center gap-2 text-xs text-white/54 sm:flex">
            <span className="size-1.5 rounded-full bg-[#35c482]" aria-hidden="true" />
            {copy.liveDemo.status}
          </div>
        </div>

        <div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
          <InboxRail
            events={events}
            activeId={activeEvent.id}
            onSelect={(id) => {
              const nextIndex = events.findIndex((event) => event.id === id);
              if (nextIndex >= 0) setActiveIndex(nextIndex);
            }}
          />
          <ConversationStage event={activeEvent} />
          <ActionRail event={activeEvent} />
        </div>
      </div>
    </motion.div>
  );
}

function InboxRail({
  events,
  activeId,
  onSelect,
}: {
  events: LandingLiveEvent[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const { copy } = useLandingLocale();

  return (
    <aside className="border-b border-white/10 bg-white/[0.025] p-4 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-white/46">{copy.liveDemo.inbox}</p>
        <span className="rounded-full bg-white/8 px-2 py-1 text-[11px] text-white/58">
          {events.length}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelect(event.id)}
            className={cn(
              "min-h-[88px] rounded-lg border p-3 text-left transition",
              activeId === event.id
                ? "border-[#67d0b2]/55 bg-[#17342d]"
                : "border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.055]",
            )}
          >
            <span className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-white/8">
                <ChannelBrandIcon
                  channel={event.channel as ChannelBrandId}
                  className="size-4"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">
                  {event.customer}
                </span>
                <span className="block truncate text-xs text-white/44">
                  {event.label}
                </span>
              </span>
            </span>
            <span className="mt-3 line-clamp-2 block text-xs leading-5 text-white/58">
              {event.message}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function ConversationStage({ event }: { event: LandingLiveEvent }) {
  const { copy } = useLandingLocale();

  return (
    <section className="relative flex min-h-[380px] flex-col justify-between border-b border-white/10 bg-[#0e1512] p-4 sm:p-6 lg:border-b-0 lg:border-r">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-white/42">{copy.liveDemo.title}</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{event.customer}</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/62">
            <ChannelBrandIcon
              channel={event.channel as ChannelBrandId}
              className="size-4"
            />
            {event.label}
          </div>
        </div>

        <motion.div
          key={`${event.id}-message`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="mt-8 max-w-[620px] rounded-lg border border-white/10 bg-white/[0.055] p-4"
        >
          <p className="text-xs font-medium uppercase text-white/38">{event.intent}</p>
          <p className="mt-2 text-base leading-7 text-white/86">{event.message}</p>
        </motion.div>

        <motion.div
          key={`${event.id}-reply`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="ml-auto mt-4 max-w-[640px] rounded-lg border border-[#67d0b2]/32 bg-[#12362d] p-4"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[#8be2c8]">
            <SparklesIcon className="size-3.5" aria-hidden="true" />
            {copy.liveDemo.aiResponse}
          </div>
          <p className="mt-2 text-base leading-7 text-white/90">{event.aiReply}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/58">
            <span className="rounded-full bg-white/8 px-2 py-1">{event.metric}</span>
            <span className="rounded-full bg-white/8 px-2 py-1">{event.nextStep}</span>
          </div>
        </motion.div>
      </div>

      <div className="mt-8 grid gap-2 sm:grid-cols-3">
        {[copy.liveDemo.synced, event.intent, event.nextStep].map((item) => (
          <div
            key={item}
            className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.035] px-3 py-2 text-xs text-white/58"
          >
            <CheckCircle2Icon className="size-3.5 text-[#73d5bb]" aria-hidden="true" />
            <span className="truncate">{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActionRail({ event }: { event: LandingLiveEvent }) {
  const { copy } = useLandingLocale();

  const actions = [
    {
      title: copy.liveDemo.crm,
      value: event.deal,
      description: event.nextStep,
      icon: CheckCircle2Icon,
    },
    {
      title: copy.liveDemo.voice,
      value: event.callStatus,
      description: event.customer,
      icon: PhoneCallIcon,
    },
    {
      title: copy.liveDemo.calendar,
      value: event.calendar,
      description: copy.liveDemo.synced,
      icon: CalendarCheckIcon,
    },
  ];

  return (
    <aside className="bg-white/[0.025] p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-white/42">{copy.liveDemo.actions}</p>
        <SendIcon className="size-4 text-white/44" aria-hidden="true" />
      </div>

      <div className="mt-4 space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon;

          return (
            <motion.div
              key={`${event.id}-${action.title}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06, duration: 0.28 }}
              className="rounded-lg border border-white/9 bg-white/[0.04] p-4"
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-white/42">
                <Icon className="size-4 text-[#7dd7bf]" aria-hidden="true" />
                {action.title}
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-white">
                {action.value}
              </p>
              <p className="mt-1 text-xs leading-5 text-white/48">{action.description}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border border-[#67d0b2]/25 bg-[#122b25] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">{copy.liveDemo.guardrailTitle}</p>
          <span className="size-2 rounded-full bg-[#67d0b2]" aria-hidden="true" />
        </div>
        <p className="mt-2 text-xs leading-5 text-white/54">
          {copy.liveDemo.guardrailText}
        </p>
      </div>
    </aside>
  );
}
