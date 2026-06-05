import { QuoteIcon } from "lucide-react";

import { LANDING_SOCIAL_PROOF } from "@/features/landing/constants";

export function LandingSocialProof() {
  return (
    <section className="relative z-10 w-full max-w-5xl px-6 py-16">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {LANDING_SOCIAL_PROOF.title}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          {LANDING_SOCIAL_PROOF.subtitle}
        </p>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {LANDING_SOCIAL_PROOF.logos.map((logo) => (
          <div
            key={logo}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur-sm"
          >
            {logo}
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {LANDING_SOCIAL_PROOF.testimonials.map((item) => (
          <figure
            key={item.author}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
          >
            <QuoteIcon className="mb-3 size-5 text-primary" aria-hidden="true" />
            <blockquote className="text-sm leading-relaxed text-foreground">
              &ldquo;{item.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-4 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{item.author}</span>
              {" · "}
              {item.role}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
