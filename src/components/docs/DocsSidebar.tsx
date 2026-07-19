"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { DOCS_NAV, DOCS_ROUTES } from "@/features/docs/nav";
import { cn } from "@/lib/utils";

type DocsSidebarProps = {
  activeSlug?: string | null;
};

export function DocsSidebar({ activeSlug = null }: DocsSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="px-3 py-4">
      <button
        type="button"
        className="mb-3 flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 lg:hidden"
        onClick={() => setMobileOpen((open) => !open)}
        aria-expanded={mobileOpen}
      >
        Browse documentation
        <ChevronDownIcon
          className={cn("size-4 transition", mobileOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      <nav
        aria-label="Documentation"
        className={cn("space-y-5", !mobileOpen && "hidden lg:block")}
      >
        <Link
          href={DOCS_ROUTES.root}
          className={cn(
            "block rounded-md px-2.5 py-1.5 text-sm font-medium transition",
            activeSlug == null
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
          )}
        >
          Overview
        </Link>

        {DOCS_NAV.map((group) => (
          <div key={group.title}>
            <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {group.title}
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {group.items.map((item) => {
                const active = item.slug === activeSlug;
                return (
                  <li key={item.slug}>
                    <Link
                      href={DOCS_ROUTES.page(item.slug)}
                      className={cn(
                        "block rounded-md px-2.5 py-1.5 text-sm transition",
                        active
                          ? "bg-zinc-900 font-medium text-white"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                      )}
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
