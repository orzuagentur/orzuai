"use client";

import { ArrowRightIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { LandingReveal } from "@/components/landing/ui/landing-motion";
import type { LandingArchitectureNode } from "@/features/landing/live-copy";
import { cn } from "@/lib/utils";

const FLOW = ["channels", "core", "ai", "crm", "calendar", "analytics"] as const;

export function LandingArchitecture() {
  const { architecture } = useLandingLocale();
  const reducedMotion = useReducedMotion();
  const nodes = FLOW.map((id) => architecture.nodes.find((node) => node.id === id)).filter(
    (node): node is LandingArchitectureNode => Boolean(node),
  );

  return (
    <section id="architecture" className="w-full bg-white px-4 py-12 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <LandingReveal className="max-w-3xl">
          <p className="landing-eyebrow">{architecture.eyebrow}</p>
          <h2 className="landing-heading mt-4 text-3xl font-semibold leading-[1.08] sm:text-5xl">
            {architecture.title}
          </h2>
          <p className="landing-copy mt-5 text-base leading-8 sm:text-lg">
            {architecture.subtitle}
          </p>
          {architecture.lead ? (
            <p className="mt-4 text-sm leading-7 text-zinc-600 sm:text-base">
              {architecture.lead}
            </p>
          ) : null}
        </LandingReveal>

        <LandingReveal className="mt-14">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/80">
            <div className="border-b border-zinc-200 bg-white px-5 py-4 sm:px-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Event pipeline
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                One inbound signal becomes a durable business action — not a disconnected chatbot reply.
              </p>
            </div>

            <ol className="divide-y divide-zinc-200">
              {nodes.map((node, index) => (
                <motion.li
                  key={node.id}
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: index * 0.04, duration: 0.3 }}
                  className="group grid gap-4 bg-white/70 px-5 py-6 transition duration-220 hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_48px_rgba(24,24,27,0.1)] sm:grid-cols-[88px_minmax(0,1fr)_minmax(0,1.2fr)] sm:items-start sm:px-8"
                >
                  <div className="flex items-center gap-3 sm:block">
                    <span className="inline-flex size-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white transition group-hover:scale-105 group-hover:bg-[var(--landing-primary)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {index < nodes.length - 1 ? (
                      <ArrowRightIcon
                        className="hidden size-4 text-zinc-300 sm:mt-4 sm:block"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-zinc-900">{node.label}</p>
                    <p className="mt-1 text-sm font-medium text-zinc-500">{node.caption}</p>
                  </div>
                  <p className="text-sm leading-7 text-zinc-600">
                    {node.detail ?? node.caption}
                  </p>
                </motion.li>
              ))}
            </ol>

            {(architecture.outcomeTitle || architecture.outcomeBody) && (
              <div className="border-t border-zinc-200 bg-zinc-900 px-5 py-8 text-white sm:px-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Business outcome
                </p>
                {architecture.outcomeTitle ? (
                  <p className="mt-2 text-xl font-semibold sm:text-2xl">
                    {architecture.outcomeTitle}
                  </p>
                ) : null}
                {architecture.outcomeBody ? (
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
                    {architecture.outcomeBody}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </LandingReveal>

        {architecture.principles && architecture.principles.length > 0 ? (
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {architecture.principles.map((principle, index) => (
              <LandingReveal key={principle.title} delay={index * 0.04}>
                <article
                  className={cn(
                    "landing-panel-hover h-full rounded-xl border border-zinc-200 bg-white p-5",
                  )}
                >
                  <p className="text-sm font-semibold text-zinc-900">{principle.title}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {principle.description}
                  </p>
                </article>
              </LandingReveal>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
