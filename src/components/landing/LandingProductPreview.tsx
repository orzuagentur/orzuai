import { BotIcon, MessageSquareIcon, UsersIcon } from "lucide-react";

import { ChannelBrandIcon } from "@/components/icons/channel-brand-icons";
import { LANDING_PRODUCT } from "@/features/landing/constants";

export function LandingProductPreview() {
  return (
    <section className="relative z-10 w-full max-w-5xl px-6 py-16">
      <div className="text-center">
        <h2 className="text-h2">{LANDING_PRODUCT.title}</h2>
        <p className="text-body mt-3 text-muted-foreground">
          {LANDING_PRODUCT.subtitle}
        </p>
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl shadow-primary/10 backdrop-blur-sm">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="size-2.5 rounded-full bg-red-400/80" />
          <span className="size-2.5 rounded-full bg-amber-400/80" />
          <span className="size-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-2 text-xs text-muted-foreground">OrzuAI Dashboard</span>
        </div>

        <div className="grid md:grid-cols-[180px_1fr]">
          <aside className="hidden border-r border-white/10 bg-black/20 p-4 md:block">
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2 rounded-md bg-primary/15 px-2 py-1.5 font-medium text-foreground">
                <MessageSquareIcon className="size-3.5 text-primary" />
                Inbox
              </li>
              <li className="flex items-center gap-2 px-2 py-1.5">
                <UsersIcon className="size-3.5" />
                CRM
              </li>
              <li className="flex items-center gap-2 px-2 py-1.5">
                <BotIcon className="size-3.5" />
                AI Agents
              </li>
            </ul>
          </aside>

          <div className="p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap gap-2">
              {(["whatsapp", "instagram", "telegram"] as const).map((channel) => (
                <div
                  key={channel}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px]"
                >
                  <ChannelBrandIcon channel={channel} className="size-3" />
                  Active
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {[
                { name: "Sofia K.", preview: "Do you ship to Tashkent?", channel: "whatsapp" as const },
                { name: "Marco R.", preview: "Thanks for the quick AI reply!", channel: "instagram" as const },
                { name: "Alex T.", preview: "What are your opening hours?", channel: "telegram" as const },
              ].map((item) => (
                <div
                  key={item.name}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
                    {item.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{item.name}</p>
                      <ChannelBrandIcon channel={item.channel} className="size-3" />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.preview}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] text-success">
                    AI
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ul className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {LANDING_PRODUCT.features.map((feature) => (
          <li
            key={feature}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground"
          >
            {feature}
          </li>
        ))}
      </ul>
    </section>
  );
}
