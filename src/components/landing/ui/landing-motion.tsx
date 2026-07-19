"use client";

import { motion, useInView, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

export function LandingReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reducedMotion ? false : { opacity: 0, y: 28 }}
      animate={inView || reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: reducedMotion ? 0 : 0.55, delay: reducedMotion ? 0 : delay, ease }}
    >
      {children}
    </motion.div>
  );
}

export function LandingSection({
  id,
  children,
  className,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("relative z-10 w-full max-w-7xl px-6 py-20 sm:py-24", className)}
    >
      {children}
    </section>
  );
}

export function LandingSectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <LandingReveal
      className={cn(
        "max-w-3xl",
        align === "center" ? "mx-auto text-center" : "text-left",
      )}
    >
      {eyebrow ? (
        <p className="landing-eyebrow mb-3">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="landing-heading text-3xl font-semibold leading-tight sm:text-5xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="landing-copy mt-5 text-base leading-8 sm:text-lg">
          {subtitle}
        </p>
      ) : null}
    </LandingReveal>
  );
}

export function LandingGlassCard({
  children,
  className,
  hover = true,
  ...props
}: HTMLMotionProps<"div"> & { hover?: boolean }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={hover && !reducedMotion ? { y: -8, scale: 1.012 } : undefined}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={cn(
        "landing-panel p-6",
        hover && "landing-panel-hover",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
