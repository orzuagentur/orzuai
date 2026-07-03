"use client";

import { motion, useReducedMotion } from "framer-motion";

import { useLandingLocale } from "@/components/landing/LandingLocaleProvider";
import { LandingReveal } from "@/components/landing/ui/landing-motion";
import type { LandingArchitectureNode } from "@/features/landing/live-copy";

const FLOW = ["channels", "core", "ai", "crm", "calendar", "analytics"] as const;

export function LandingArchitecture() {
  const { architecture } = useLandingLocale();
  const reducedMotion = useReducedMotion();
  const nodes = FLOW.map((id) => architecture.nodes.find((node) => node.id === id)).filter(
    (node): node is LandingArchitectureNode => Boolean(node),
  );

  return (
    <section id="architecture" className="w-full bg-[#eef3ef] px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <LandingReveal className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase text-[#1e6f5c]">
            {architecture.eyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-[#101815] sm:text-5xl">
            {architecture.title}
          </h2>
          <p className="mt-5 text-base leading-8 text-[#52625a] sm:text-lg">
            {architecture.subtitle}
          </p>
        </LandingReveal>

        <LandingReveal className="mt-12">
          <div
            className="relative overflow-hidden rounded-lg border border-[#d1ded6] bg-white p-4 sm:p-6"
            role="img"
            aria-label={architecture.subtitle}
          >
            <div className="absolute left-8 right-8 top-[4.3rem] hidden h-px bg-[#d9e3dc] lg:block" />
            {!reducedMotion ? (
              <motion.div
                className="absolute top-[4.15rem] hidden size-2 rounded-full bg-[#1e6f5c] lg:block"
                animate={{ left: ["7%", "92%"], opacity: [0, 1, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden="true"
              />
            ) : null}

            <ol className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              {nodes.map((node, index) => (
                <motion.li
                  key={node.id}
                  initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04, duration: 0.28 }}
                  className="relative list-none rounded-lg border border-[#e1e8e3] bg-[#f7f9f6] p-4"
                >
                  <div className="mb-8 inline-flex size-8 items-center justify-center rounded-full bg-[#101815] text-xs font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-base font-semibold text-[#101815]">{node.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[#5a6961]">{node.caption}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
