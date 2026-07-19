"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

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
  type LiveSystemView,
} from "@/features/landing/demo";

export function LivePlatformSurface() {
  const { copy, locale } = useLandingLocale();
  const reducedMotion = useReducedMotion();
  const events = getLiveDemoEvents(locale);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeView, setActiveView] = useState<LiveSystemView>("inbox");
  const [userPinned, setUserPinned] = useState(false);

  const activeEvent = events[activeIndex % events.length] ?? events[0]!;
  const chatEnabled = activeView === "inbox" && activeEvent.channel !== "voice";
  const { visibleMessages } = useEndlessDemoChat(
    activeEvent.messages,
    chatEnabled,
    reducedMotion,
  );

  useEffect(() => {
    if (reducedMotion || userPinned) return;

    const timer = window.setInterval(() => {
      setActiveIndex((value) => (value + 1) % events.length);
      setActiveView("inbox");
    }, 14000);

    return () => window.clearInterval(timer);
  }, [events.length, reducedMotion, userPinned]);

  function selectEvent(id: string) {
    const nextIndex = events.findIndex((event) => event.id === id);
    if (nextIndex < 0) return;

    const nextEvent = events[nextIndex];
    setActiveIndex(nextIndex);
    setActiveView(nextEvent?.channel === "voice" ? "calls" : "inbox");
    setUserPinned(true);
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
}: {
  event: ReturnType<typeof getLiveDemoEvents>[number];
  events: ReturnType<typeof getLiveDemoEvents>;
  activeView: LiveSystemView;
  messages: ReturnType<typeof getLiveDemoEvents>[number]["messages"];
}) {
  if (activeView === "calls" || (activeView === "inbox" && event.channel === "voice")) {
    return <AiCallsStage event={event} />;
  }

  if (activeView === "calendar") {
    return <CalendarStage event={event} allEvents={events} />;
  }

  return <ConversationStage event={event} messages={messages} />;
}
