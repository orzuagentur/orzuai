"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { ChannelBrandIcon, type ChannelBrandId } from "@/components/icons/channel-brand-icons";
import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { getMicroVoiceLines } from "@/features/landing/platform-services";
import { cn } from "@/lib/utils";

type LandingMicroIncomingProps = {
  channel: ChannelBrandId;
  text: string;
  className?: string;
  delay?: number;
};

export function LandingMicroIncoming({
  channel,
  text,
  className,
  delay = 0,
}: LandingMicroIncomingProps) {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => setVisible(true), 220);
    }, 3200 + delay);

    return () => window.clearInterval(timer);
  }, [delay, reducedMotion]);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: reducedMotion || visible ? 1 : 0.35, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "inline-flex max-w-[220px] items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 backdrop-blur-md",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <ChannelBrandIcon channel={channel} className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate text-[11px] text-white/62">{text}</span>
      <span className="size-1 shrink-0 rounded-full bg-emerald-400/80" aria-hidden="true" />
    </motion.div>
  );
}

export function LandingMicroVoice({ className }: { className?: string }) {
  const { locale } = useLandingLocale();
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const lines = getMicroVoiceLines(locale);
  const label = lines[index % lines.length] ?? lines[0];

  useEffect(() => {
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setIndex((value) => value + 1);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  return (
    <motion.div
      animate={reducedMotion ? undefined : { opacity: [0.55, 1, 0.55] }}
      transition={reducedMotion ? undefined : { repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/55 backdrop-blur-md",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <ChannelBrandIcon channel="voice" className="size-3.5" aria-hidden="true" />
      <span>{label}</span>
    </motion.div>
  );
}
