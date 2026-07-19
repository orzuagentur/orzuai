"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { AiCallsStage } from "@/components/landing/live-demo/AiCallsStage";
import { CalendarStage } from "@/components/landing/live-demo/CalendarStage";
import {
  ConversationStage,
  LeftMenu,
} from "@/components/landing/live-demo/InboxAndChat";
import { useEndlessDemoChat } from "@/components/landing/live-demo/hooks";
import {
  getLiveDemoEvents,
  type LandingLiveEvent,
  type LiveSystemView,
} from "@/features/landing/demo";
type LivePlatformSurfaceProps = {
  /** Compact phone preview: header arrows cycle every inbox + calendar. */
  compact?: boolean;
};

type MobileSlide =
  | { kind: "event"; eventIndex: number }
  | { kind: "calendar" };

export function LivePlatformSurface({ compact = false }: LivePlatformSurfaceProps) {
  const { copy, locale } = useLandingLocale();
  const reducedMotion = useReducedMotion();
  const events = getLiveDemoEvents(locale);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeView, setActiveView] = useState<LiveSystemView>("inbox");
  const [userPinned, setUserPinned] = useState(false);
  const [mobileSlide, setMobileSlide] = useState(0);

  const slides = useMemo<MobileSlide[]>(() => {
    const list: MobileSlide[] = events.map((_, eventIndex) => ({
      kind: "event",
      eventIndex,
    }));
    list.push({ kind: "calendar" });
    return list;
  }, [events]);

  const activeEvent = events[activeIndex % events.length] ?? events[0]!;
  const mobileCurrent = slides[mobileSlide % slides.length] ?? slides[0]!;
  const mobileEvent =
    mobileCurrent.kind === "event"
      ? (events[mobileCurrent.eventIndex] ?? events[0]!)
      : activeEvent;

  const chatEvent = compact ? mobileEvent : activeEvent;
  const chatEnabled =
    compact
      ? mobileCurrent.kind === "event" && mobileEvent.channel !== "voice"
      : activeView === "inbox" && activeEvent.channel !== "voice";

  const { visibleMessages } = useEndlessDemoChat(
    chatEvent.messages,
    chatEnabled,
    reducedMotion,
  );

  const mobileHeaderLabel = useMemo(() => {
    if (mobileCurrent.kind === "calendar") return copy.liveDemo.calendar;
    if (mobileEvent.channel === "voice") return copy.liveDemo.calls;
    return mobileEvent.label;
  }, [copy.liveDemo.calendar, copy.liveDemo.calls, mobileCurrent.kind, mobileEvent]);

  useEffect(() => {
    if (reducedMotion || userPinned) return;

    const timer = window.setInterval(() => {
      if (compact) {
        setMobileSlide((value) => (value + 1) % slides.length);
        return;
      }
      setActiveIndex((value) => (value + 1) % events.length);
      setActiveView("inbox");
    }, 14000);

    return () => window.clearInterval(timer);
  }, [compact, events.length, reducedMotion, slides.length, userPinned]);

  function selectEvent(id: string) {
    const nextIndex = events.findIndex((event) => event.id === id);
    if (nextIndex < 0) return;

    const nextEvent = events[nextIndex];
    setActiveIndex(nextIndex);
    setActiveView(nextEvent?.channel === "voice" ? "calls" : "inbox");
    setUserPinned(true);
  }

  function shiftMobileSlide(delta: number) {
    setUserPinned(true);
    setMobileSlide((value) => (value + delta + slides.length) % slides.length);
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto mt-5 max-w-lg"
      >
        <div
          className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-[0_16px_40px_rgba(24,24,27,0.1)]"
          role="group"
          aria-label={copy.liveDemo.subtitle}
        >
          <div className="glass-header flex h-9 items-center gap-1 px-2">
            <div className="flex w-10 shrink-0 items-center gap-1">
              <span className="size-1.5 rounded-full bg-zinc-300" />
              <span className="size-1.5 rounded-full bg-zinc-300" />
              <span className="size-1.5 rounded-full bg-zinc-300" />
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
              <button
                type="button"
                aria-label="Previous inbox"
                onClick={() => shiftMobileSlide(-1)}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
              >
                <ChevronLeftIcon className="size-3.5" aria-hidden="true" />
              </button>
              <p className="min-w-0 truncate text-center text-[10px] font-semibold text-zinc-700">
                {mobileHeaderLabel}
              </p>
              <button
                type="button"
                aria-label="Next inbox"
                onClick={() => shiftMobileSlide(1)}
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
              >
                <ChevronRightIcon className="size-3.5" aria-hidden="true" />
              </button>
            </div>

            <p className="w-10 shrink-0 text-right text-[9px] font-medium text-zinc-400">
              OrzuX
            </p>
          </div>

          <div className="dashboard-workspace h-[min(400px,62vh)] min-h-0 overflow-hidden">
            <LiveSystemStage
              event={mobileEvent}
              events={events}
              activeView={
                mobileCurrent.kind === "calendar"
                  ? "calendar"
                  : mobileEvent.channel === "voice"
                    ? "calls"
                    : "inbox"
              }
              messages={visibleMessages}
              compact
              onUserInteract={() => setUserPinned(true)}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto mt-6 max-w-6xl sm:mt-10"
    >
      <div
        className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_24px_80px_rgba(24,24,27,0.08),0_8px_24px_rgba(24,24,27,0.04)]"
        role="group"
        aria-label={copy.liveDemo.subtitle}
      >
        <div className="glass-header flex h-11 items-center justify-between px-4">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-zinc-300" aria-hidden="true" />
            <span className="size-2.5 rounded-full bg-zinc-300" aria-hidden="true" />
            <span className="size-2.5 rounded-full bg-zinc-300" aria-hidden="true" />
          </div>
          <div className="hidden items-center gap-2 text-[11px] font-medium text-zinc-500 sm:flex">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--landing-coral)] opacity-50" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[var(--landing-coral)]" />
            </span>
            {copy.liveDemo.status}
          </div>
          <p className="text-[11px] font-medium text-zinc-400">OrzuX</p>
        </div>

        <div className="dashboard-workspace grid h-[min(420px,58vh)] grid-cols-1 sm:h-[min(560px,68vh)] lg:h-[min(720px,78vh)] lg:grid-cols-[250px_minmax(0,1fr)]">
          <LeftMenu
            events={events}
            activeId={activeEvent.id}
            activeView={activeView}
            onSelect={selectEvent}
            onOpenCalendar={() => {
              setActiveView("calendar");
              setUserPinned(true);
            }}
          />
          <div className="min-h-0 overflow-hidden">
            <LiveSystemStage
              event={activeEvent}
              events={events}
              activeView={activeView}
              messages={visibleMessages}
              onUserInteract={() => setUserPinned(true)}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function LiveSystemStage({
  event,
  events,
  activeView,
  messages,
  compact = false,
  onUserInteract,
}: {
  event: LandingLiveEvent;
  events: LandingLiveEvent[];
  activeView: LiveSystemView;
  messages: LandingLiveEvent["messages"];
  compact?: boolean;
  onUserInteract?: () => void;
}) {
  if (activeView === "calls" || (activeView === "inbox" && event.channel === "voice")) {
    return (
      <AiCallsStage
        event={event}
        compact={compact}
        onUserInteract={onUserInteract}
      />
    );
  }

  if (activeView === "calendar") {
    return <CalendarStage event={event} allEvents={events} compact={compact} />;
  }

  return <ConversationStage event={event} messages={messages} compact={compact} />;
}
