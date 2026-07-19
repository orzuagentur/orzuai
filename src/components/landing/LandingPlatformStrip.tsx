"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { getPlatformServices } from "@/features/landing/platform-services";
import { cn } from "@/lib/utils";

type LandingPlatformStripProps = {
  open: boolean;
};

export function LandingPlatformStrip({ open }: LandingPlatformStripProps) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="border-b border-white/10 bg-[#0f1716]/95 backdrop-blur-xl"
          role="region"
          aria-label="OrzuX platform modules"
        >
          <PlatformStripContent />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function PlatformStripContent() {
  const { copy, locale } = useLandingLocale();
  const services = getPlatformServices(locale);

  return (
    <div className="mx-auto max-w-6xl px-6 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase text-white/38">
          {copy.platformStrip.title}
        </p>
        <p className="text-[11px] text-white/38">
          {copy.platformStrip.liveLabel} - {copy.platformStrip.subtitle}
        </p>
      </div>

      <div
        className="flex items-stretch gap-0 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {services.map((service, index) => (
          <ServiceCell
            key={service.id}
            index={index}
            isLast={index === services.length - 1}
            {...service}
          />
        ))}
      </div>
    </div>
  );
}

function ServiceCell({
  label,
  hint,
  liveLine,
  channel,
  Icon,
  index,
  isLast,
}: ReturnType<typeof getPlatformServices>[number] & { index: number; isLast: boolean }) {
  const reducedMotion = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;

    const timer = window.setInterval(() => setTick((value) => value + 1), 2600 + index * 120);
    return () => window.clearInterval(timer);
  }, [index, reducedMotion]);

  const pulse = tick % 2 === 0;

  return (
    <div
      role="listitem"
      className={cn(
        "group relative flex min-w-[132px] shrink-0 flex-col justify-center px-3.5 py-2.5 transition-colors duration-300",
        !isLast && "border-r border-white/[0.06]",
        pulse && !reducedMotion && "bg-white/[0.03]",
      )}
    >
      <div className="flex items-center gap-2">
        {channel ? (
          <ChannelBrandIcon channel={channel} className="size-3.5 shrink-0" aria-hidden="true" />
        ) : Icon ? (
          <Icon className="size-3.5 shrink-0 text-white/50" strokeWidth={1.75} aria-hidden="true" />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-white/88">{label}</p>
          <p className="truncate text-[10px] text-white/32">{hint}</p>
        </div>
      </div>
      <p className="mt-1.5 truncate text-[10px] text-white/45">{liveLine}</p>
    </div>
  );
}
