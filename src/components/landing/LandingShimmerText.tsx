"use client";

import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

type LandingShimmerTextProps = {
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  children: ReactNode;
};

export function LandingShimmerText({
  as: Tag = "span",
  className,
  children,
}: LandingShimmerTextProps) {
  function onMove(event: React.MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    event.currentTarget.style.setProperty("--shine-x", `${x}%`);
  }

  return (
    <Tag
      className={cn("landing-shimmer-text", className)}
      onMouseMove={onMove}
      style={{ "--shine-x": "50%" } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
