"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Suspense,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ChannelTransferModal } from "@/components/ChannelTransferModal";
import { NoYoutubeChannelModal } from "@/components/NoYoutubeChannelModal";
import { ChannelsMenu } from "@/components/ChannelsMenu";
import { ClippingProgressDock } from "@/components/ClippingProgressDock";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MusicUploadProvider } from "@/components/MusicUploadProvider";
import { MusicUploadDock } from "@/components/MusicUploadDock";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { isFeatureLocked, type ProductLockId } from "@/lib/product-locks";
import { useProductLocks } from "@/lib/product-locks-client";

type NavItem = {
  href: string;
  labelKey: string;
  exact?: boolean;
  icon:
    | "home"
    | "youtube"
    | "creators"
    | "clipping"
    | "creativity"
    | "presentation"
    | "library"
    | "account"
    | "settings"
    | "videos";
};

/** Primary tabs — bottom bar + desktop center */
const PRIMARY_NAV: NavItem[] = [
  {
    href: "/dashboard",
    labelKey: "autopilot",
    exact: true,
    icon: "home",
  },
  {
    href: "/dashboard/content",
    labelKey: "createVideo",
    icon: "creativity",
  },
  {
    href: "/dashboard/channel",
    labelKey: "youtube",
    icon: "youtube",
  },
];

/** Items moved into the top hamburger menu — flat fallback for title lookup */
const MENU_NAV: NavItem[] = [
  {
    href: "/dashboard/channel",
    labelKey: "videos",
    icon: "videos",
  },
  {
    href: "/dashboard/favorites",
    labelKey: "myVault",
    icon: "library",
  },
];

type MenuItemIcon =
  | "ai-video"
  | "ai-clip"
  | "ai-present"
  | "photo-edit"
  | "video-edit"
  | "present"
  | "videos"
  | "photos"
  | "models"
  | "hdris"
  | "textures"
  | "emojis"
  | "icons"
  | "vault"
  | "creators";

type MenuGroup = {
  id: string;
  labelKey: string;
  items: {
    href: string;
    labelKey: string;
    icon: MenuItemIcon;
    featureId?: ProductLockId;
    featureIds?: ProductLockId[];
    requiredFeatureIds?: ProductLockId[];
  }[];
};

const MENU_GROUPS: MenuGroup[] = [
  {
    id: "create",
    labelKey: "groupCreate",
    items: [
      { href: "/dashboard/content", labelKey: "aiVideo", icon: "ai-video" },
      { href: "/dashboard/clipping", labelKey: "aiClipping", icon: "ai-clip" },
    ],
  },
  {
    id: "vault",
    labelKey: "groupVault",
    items: [
      {
        href: "/dashboard/favorites?tab=clips",
        labelKey: "myClips",
        icon: "ai-clip",
      },
      {
        href: "/dashboard/favorites?tab=videos",
        labelKey: "myVideos",
        icon: "ai-video",
      },
      {
        href: "/dashboard/favorites?tab=favorites",
        labelKey: "favorites",
        icon: "vault",
      },
    ],
  },
  {
    id: "labs",
    labelKey: "groupLabs",
    items: [
      {
        href: "/dashboard/creators/ai-presentation",
        labelKey: "aiPresentation",
        icon: "ai-present",
        requiredFeatureIds: ["ai_presentation", "presentation_editor"],
      },
      {
        href: "/dashboard/creators/presentation",
        labelKey: "presentations",
        icon: "present",
        featureId: "presentation_editor",
      },
      {
        href: "/dashboard/creators/photo-editor",
        labelKey: "photoEditor",
        icon: "photo-edit",
        featureId: "photo_editor",
      },
      {
        href: "/dashboard/creators/content",
        labelKey: "videoEditor",
        icon: "video-edit",
        featureId: "content",
      },
      {
        href: "/dashboard/creators/library/photos",
        labelKey: "assetLibraries",
        icon: "photos",
        featureId: "asset_libraries",
      },
      {
        href: "/dashboard/favorites?tab=presentations",
        labelKey: "myPresentations",
        icon: "present",
        featureId: "presentation_editor",
      },
    ],
  },
];

const ALL_NAV: NavItem[] = [...PRIMARY_NAV, ...MENU_NAV];

const LIBRARY_TABS = [
  { id: "clips", labelKey: "myClips", shortKey: "clipsShort" },
  { id: "videos", labelKey: "myVideos", shortKey: "videosShort" },
  { id: "presentations", labelKey: "myPresentations", shortKey: "decksShort" },
  { id: "favorites", labelKey: "favorites", shortKey: "favsShort" },
] as const;

const CLIPPING_TABS = [
  { id: "create", labelKey: "create", shortKey: "create" },
  { id: "clips", labelKey: "myClips", shortKey: "clipsShort" },
] as const;

const CREATIVITY_TABS = [
  { id: "create", labelKey: "create", shortKey: "create" },
  { id: "library", labelKey: "myCreations", shortKey: "mineShort" },
] as const;

const AI_PRESENTATION_TABS = [
  { id: "create", labelKey: "create", shortKey: "create" },
  { id: "library", labelKey: "myPresentations", shortKey: "mineShort" },
] as const;

function NavIcon({
  name,
  active,
  size = 18,
}: {
  name: NavItem["icon"];
  active?: boolean;
  size?: number;
}) {
  const stroke = active ? "var(--accent)" : "currentColor";
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common} viewBox="0 0 28 20" width={size} height={Math.round(size * 0.72)}>
          <path
            fill="#FF0000"
            stroke="none"
            d="M27.43 3.13A3.52 3.52 0 0 0 24.95.64C22.74 0 14 0 14 0S5.26 0 3.05.64A3.52 3.52 0 0 0 .57 3.13 36.8 36.8 0 0 0 0 10a36.8 36.8 0 0 0 .57 6.87 3.52 3.52 0 0 0 2.48 2.49C5.26 20 14 20 14 20s8.74 0 10.95-.64a3.52 3.52 0 0 0 2.48-2.49A36.8 36.8 0 0 0 28 10a36.8 36.8 0 0 0-.57-6.87Z"
            opacity={active ? 1 : 0.85}
          />
          <path
            fill="#fff"
            stroke="none"
            d="M11.2 14.29V5.71L18.4 10l-7.2 4.29Z"
          />
        </svg>
      );
    case "creators":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <circle cx="16.5" cy="9.5" r="2.4" />
          <path d="M3.5 19c.8-3.2 2.9-5 5.5-5s4.7 1.8 5.5 5" />
          <path d="M14 19c.4-1.8 1.6-3 3.2-3 1.4 0 2.5.8 3.1 2.2" />
        </svg>
      );
    case "clipping":
      /* Professional scissors / cut mark */
      return (
        <svg {...common}>
          <circle cx="6.5" cy="7" r="2.4" />
          <circle cx="6.5" cy="17" r="2.4" />
          <path d="M8.7 8.4 20 3.5" />
          <path d="M8.7 15.6 20 20.5" />
          <path d="M14.2 12h6.3" />
        </svg>
      );
    case "creativity":
      /* Video play — AI Video */
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path
            d="M10.2 9.2v5.6L15.5 12 10.2 9.2Z"
            fill={active ? "var(--accent)" : "currentColor"}
            stroke="none"
            opacity={active ? 1 : 0.9}
          />
        </svg>
      );
    case "presentation":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 20h8M12 17v3" />
          <path d="M7 8h5M7 11h8" />
        </svg>
      );
    case "library":
      return (
        <svg {...common}>
          <path d="M5 4.5h10.5A1.5 1.5 0 0 1 17 6v13.2l-5.5-2.6L6 19.2V6A1.5 1.5 0 0 1 7.5 4.5" />
          <path d="M17 7.2h1.5A1.5 1.5 0 0 1 20 8.7v10.5" />
        </svg>
      );
    case "videos":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M7 9h4M7 13h3" />
          <path
            d="M14 9.3v5.4l4.4-2.7L14 9.3Z"
            fill={active ? "var(--accent)" : "currentColor"}
            stroke="none"
          />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5l2.6-1.5M17.2 9l2.6-1.5" />
          <circle cx="12" cy="12" r="3.2" />
        </svg>
      );
    case "account":
      return (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="3.4" />
          <path d="M5 19.5c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5" />
        </svg>
      );
    default:
      return null;
  }
}

function MenuIcon({ open }: { open?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

/** Official YouTube play-mark (red badge). */
function YouTubeMenuMark({ size = 18 }: { size?: number }) {
  const h = Math.round(size * 0.72);
  return (
    <svg width={size} height={h} viewBox="0 0 28 20" aria-hidden>
      <path
        fill="#fff"
        d="M27.43 3.13A3.52 3.52 0 0 0 24.95.64C22.74 0 14 0 14 0S5.26 0 3.05.64A3.52 3.52 0 0 0 .57 3.13 36.8 36.8 0 0 0 0 10a36.8 36.8 0 0 0 .57 6.87 3.52 3.52 0 0 0 2.48 2.49C5.26 20 14 20 14 20s8.74 0 10.95-.64a3.52 3.52 0 0 0 2.48-2.49A36.8 36.8 0 0 0 28 10a36.8 36.8 0 0 0-.57-6.87Z"
      />
      <path fill="#FF0000" d="M11.2 14.29V5.71L18.4 10l-7.2 4.29Z" />
    </svg>
  );
}

function MenuEntryIcon({ name }: { name: MenuItemIcon }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "ai-video":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M10 9.2v5.6L15.2 12 10 9.2Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "ai-clip":
      return (
        <svg {...common}>
          <circle cx="6.5" cy="7" r="2.4" />
          <circle cx="6.5" cy="17" r="2.4" />
          <path d="M8.7 8.4 20 3.5M8.7 15.6 20 20.5M14.2 12h6.3" />
        </svg>
      );
    case "ai-present":
      return (
        <svg {...common}>
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
          <rect x="7" y="7" width="10" height="10" rx="2.5" />
        </svg>
      );
    case "photo-edit":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="M3 16.5 8 12l3.5 3.5L15 12l6 5" />
        </svg>
      );
    case "video-edit":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="14" height="14" rx="2" />
          <path d="M17 9h4v10a2 2 0 0 1-2 2h-8" />
          <path d="M8 10.5 12 13l-4 2.5v-5Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "present":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 20h8M12 17v3M7 8h5M7 11h8" />
        </svg>
      );
    case "videos":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M10 9.5v5l5-2.5-5-2.5Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "photos":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.8" />
          <path d="M3 16.5 8 12l3 3 4-4.5 6 6" />
        </svg>
      );
    case "models":
      return (
        <svg {...common}>
          <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="M12 12v9M12 12 4 7.5M12 12l8-4.5" />
        </svg>
      );
    case "hdris":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4v16M4 12h16" opacity={0.45} />
          <path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8" opacity={0.35} />
        </svg>
      );
    case "textures":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 10h16M4 16h16M10 4v16M16 4v16" opacity={0.55} />
        </svg>
      );
    case "emojis":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M9 10h.01M15 10h.01M8.5 14.5c1.2 1.4 2.7 2 3.5 2s2.3-.6 3.5-2" />
        </svg>
      );
    case "icons":
      return (
        <svg {...common}>
          <path d="M12 3 14.5 9.5 21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
        </svg>
      );
    case "vault":
      return (
        <svg {...common}>
          <path d="M5 4.5h10.5A1.5 1.5 0 0 1 17 6v13.2l-5.5-2.6L6 19.2V6A1.5 1.5 0 0 1 7.5 4.5" />
          <path d="M17 7.2h1.5A1.5 1.5 0 0 1 20 8.7v10.5" />
        </svg>
      );
    case "creators":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <circle cx="16.5" cy="9.5" r="2.4" />
          <path d="M3.5 19c.8-3.2 2.9-5 5.5-5s4.7 1.8 5.5 5" />
          <path d="M14 19c.4-1.8 1.6-3 3.2-3 1.4 0 2.5.8 3.1 2.2" />
        </svg>
      );
    default:
      return null;
  }
}

function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  // Keep "For creators" from stealing active state from AI Presentation.
  if (item.href === "/dashboard/creators") {
    if (pathname.startsWith("/dashboard/creators/ai-presentation")) return false;
    return (
      pathname === "/dashboard/creators" ||
      pathname.startsWith("/dashboard/creators/")
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function MobileBottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 lg:hidden"
      aria-label="Main"
    >
      <div
        className="pointer-events-auto relative flex w-full max-w-[28rem] items-stretch justify-between gap-0.5 overflow-hidden rounded-full border px-1 py-1.5 backdrop-blur-2xl"
        style={{
          borderColor: "rgba(255,255,255,0.18)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 28%, rgba(18,20,26,0.78) 55%, rgba(12,14,18,0.92) 100%)",
          boxShadow:
            "0 14px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <span
          className="pointer-events-none absolute inset-x-3 top-0 h-1/2 rounded-full opacity-70"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 55%, transparent 100%)",
          }}
          aria-hidden
        />
        {PRIMARY_NAV.map((item) => {
          const active = isNavActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative z-[1] flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1.5 py-1.5 transition active:scale-[0.96]"
              style={{
                color: active ? "var(--accent)" : "var(--muted)",
                background: active ? "rgba(232,165,75,0.14)" : "transparent",
                boxShadow: active
                  ? "inset 0 1px 0 rgba(255,255,255,0.12)"
                  : undefined,
              }}
              aria-current={active ? "page" : undefined}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                <NavIcon name={item.icon} active={active} size={20} />
              </span>
              <span className="max-w-full text-center text-[10px] font-semibold leading-tight tracking-tight">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SectionTabButton({
  on,
  label,
  short,
  onClick,
}: {
  on: boolean;
  label: string;
  short: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 flex-1 rounded-full px-2 py-2 text-xs font-semibold transition sm:rounded-lg sm:px-4 sm:text-sm"
      style={{
        background: on ? "rgba(232,165,75,0.16)" : "transparent",
        color: on ? "var(--accent)" : "var(--muted)",
      }}
    >
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function LibraryHeaderTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("nav");
  const locks = useProductLocks();
  const raw = searchParams.get("tab");
  const tabs = LIBRARY_TABS.filter(
    (item) =>
      item.id !== "presentations" ||
      !isFeatureLocked(locks, "presentation_editor"),
  );
  const tab =
    raw === "videos" ||
    raw === "favorites" ||
    raw === "clips" ||
    raw === "presentations"
      ? raw
      : "clips";

  return (
    <nav
      className="mx-auto flex w-full max-w-4xl gap-1 rounded-full border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-1 sm:rounded-xl"
      aria-label={t("myVault")}
    >
      {tabs.map((item) => (
        <SectionTabButton
          key={item.id}
          on={tab === item.id}
          label={t(item.labelKey)}
          short={t(item.shortKey)}
          onClick={() => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("tab", item.id);
            router.replace(`/dashboard/favorites?${next.toString()}`, {
              scroll: false,
            });
          }}
        />
      ))}
    </nav>
  );
}

function ClippingHeaderTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("nav");
  const raw = searchParams.get("tab");
  const tab = raw === "clips" || raw === "create" ? raw : "create";

  return (
    <nav
      className="mx-auto flex w-full max-w-2xl gap-1 rounded-full border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-1 sm:rounded-xl"
      aria-label={t("aiClipping")}
    >
      {CLIPPING_TABS.map((item) => (
        <SectionTabButton
          key={item.id}
          on={tab === item.id}
          label={t(item.labelKey)}
          short={t(item.shortKey)}
          onClick={() => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("tab", item.id);
            router.replace(`/dashboard/clipping?${next.toString()}`, {
              scroll: false,
            });
          }}
        />
      ))}
    </nav>
  );
}

function CreativityHeaderTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("nav");
  const raw = searchParams.get("tab");
  const tab = raw === "library" || raw === "create" ? raw : "create";

  return (
    <nav
      className="mx-auto flex w-full max-w-2xl gap-1 rounded-full border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-1 sm:rounded-xl"
      aria-label={t("aiVideo")}
    >
      {CREATIVITY_TABS.map((item) => (
        <SectionTabButton
          key={item.id}
          on={tab === item.id}
          label={t(item.labelKey)}
          short={t(item.shortKey)}
          onClick={() => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("tab", item.id);
            router.replace(`/dashboard/content?${next.toString()}`, {
              scroll: false,
            });
          }}
        />
      ))}
    </nav>
  );
}

function AiPresentationHeaderTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("nav");
  const raw = searchParams.get("tab");
  const tab = raw === "library" || raw === "create" ? raw : "create";

  return (
    <nav
      className="mx-auto flex w-full max-w-2xl gap-1 rounded-full border border-[color:var(--line)] bg-[color:var(--bg-elevated)] p-1 sm:rounded-xl"
      aria-label={t("aiPresentation")}
    >
      {AI_PRESENTATION_TABS.map((item) => (
        <SectionTabButton
          key={item.id}
          on={tab === item.id}
          label={t(item.labelKey)}
          short={t(item.shortKey)}
          onClick={() => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("tab", item.id);
            router.replace(
              `/dashboard/creators/ai-presentation?${next.toString()}`,
              { scroll: false },
            );
          }}
        />
      ))}
    </nav>
  );
}

type ChannelsCtx = {
  menuOpen: boolean;
  setMenuOpen: (v: boolean | ((p: boolean) => boolean)) => void;
};

const ChannelsContext = createContext<ChannelsCtx | null>(null);

export function useChannelsMenu() {
  const ctx = useContext(ChannelsContext);
  if (!ctx) {
    throw new Error("useChannelsMenu must be used within AppShell");
  }
  return ctx;
}

/** Official YouTube mark — white body for use on the red channel button */
export function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="16"
      viewBox="0 0 28 20"
      aria-hidden
    >
      <path
        fill="#fff"
        d="M27.43 3.13A3.52 3.52 0 0 0 24.95.64C22.74 0 14 0 14 0S5.26 0 3.05.64A3.52 3.52 0 0 0 .57 3.13 36.8 36.8 0 0 0 0 10a36.8 36.8 0 0 0 .57 6.87 3.52 3.52 0 0 0 2.48 2.49C5.26 20 14 20 14 20s8.74 0 10.95-.64a3.52 3.52 0 0 0 2.48-2.49A36.8 36.8 0 0 0 28 10a36.8 36.8 0 0 0-.57-6.87Z"
      />
      <path fill="#FF0000" d="M11.2 14.29V5.71L18.4 10l-7.2 4.29Z" />
    </svg>
  );
}

function TinyChevron({ open = false }: { open?: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{
        transform: open ? "rotate(180deg)" : undefined,
        transition: "transform 0.15s ease",
        opacity: 0.85,
      }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function YouTubeChannelsButton({
  className = "",
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const tc = useTranslations("common");
  const { menuOpen, setMenuOpen } = useChannelsMenu();
  const onChannel =
    pathname === "/dashboard/channel" ||
    (pathname.startsWith("/dashboard/channel/") &&
      !pathname.startsWith("/dashboard/channel/training"));

  return (
    <div className={`relative shrink-0 ${className}`} data-channels-toggle>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
        className="inline-flex h-9 w-full max-w-full items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] sm:h-10 sm:w-auto sm:justify-start sm:px-4"
        style={{
          background: "#FF0000",
          boxShadow:
            menuOpen || onChannel
              ? "0 0 0 2px rgba(255,255,255,0.2)"
              : "0 6px 18px rgba(255,0,0,0.28)",
        }}
      >
        <YouTubeIcon />
        <span className="truncate sm:hidden">{tc("channels")}</span>
        <span className="hidden whitespace-nowrap sm:inline">
          {tc("youtubeChannels")}
        </span>
        <TinyChevron open={menuOpen} />
      </button>
      <ChannelsMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

function AppMenu({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const ts = useTranslations("studio.common");
  const locks = useProductLocks();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>("create");
  const [isMobile, setIsMobile] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!open) {
      setAccountOpen(false);
      return;
    }
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const youtubeActive =
    pathname === "/dashboard/channel" ||
    pathname.startsWith("/dashboard/channel/");
  const visibleMenuGroups = MENU_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        item.requiredFeatureIds
          ? item.requiredFeatureIds.every((id) => !isFeatureLocked(locks, id))
          : item.featureIds
            ? item.featureIds.some((id) => !isFeatureLocked(locks, id))
            : !item.featureId || !isFeatureLocked(locks, item.featureId),
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? tc("closeMenu") : tc("openMenu")}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/5 text-[color:var(--fg)] transition hover:bg-white/10 sm:h-10 sm:w-10"
        style={{
          boxShadow: open ? "0 0 0 2px rgba(232,165,75,0.35)" : undefined,
        }}
      >
        <MenuIcon open={open} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-[80] mt-2 max-h-[min(80vh,560px)] w-[min(100vw-2rem,320px)] overflow-y-auto overflow-x-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)] shadow-2xl"
          role="dialog"
          aria-label={ts("mainMenu")}
        >
          <div className="p-2">
            <Link
              href="/dashboard/channel"
              onClick={() => setOpen(false)}
              aria-current={youtubeActive ? "page" : undefined}
              className="mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-white transition hover:brightness-110"
              style={{
                background: "#FF0000",
                boxShadow: youtubeActive
                  ? "0 0 0 2px rgba(255,255,255,0.35)"
                  : "0 8px 20px rgba(255,0,0,0.28)",
              }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/15">
                <YouTubeMenuMark size={20} />
              </span>
              <span className="flex-1">{t("youtube")}</span>
            </Link>

            {visibleMenuGroups.map((group) => {
              const expanded = !isMobile || openGroup === group.id;
              return (
                <div key={group.id} className="mb-1">
                  {isMobile ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)] transition hover:bg-white/5"
                      onClick={() =>
                        setOpenGroup((v) => (v === group.id ? null : group.id))
                      }
                      aria-expanded={expanded}
                    >
                      <span className="flex-1">{t(group.labelKey)}</span>
                      <TinyChevron open={expanded} />
                    </button>
                  ) : (
                    <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">
                      {t(group.labelKey)}
                    </p>
                  )}
                  {expanded && (
                    <div className="mb-1 space-y-0.5 pl-0.5">
                      {group.items.map((item) => {
                        const pathOnly = item.href.split("?")[0];
                        const tabParam = new URL(
                          item.href,
                          "https://orzu.local",
                        ).searchParams.get("tab");
                        const currentVaultTab =
                          searchParams.get("tab") || "clips";
                        const active = tabParam
                          ? pathname.startsWith(pathOnly) &&
                            currentVaultTab === tabParam
                          : pathname === pathOnly ||
                            pathname.startsWith(`${pathOnly}/`);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-white/5"
                            style={{
                              color: active ? "var(--accent)" : "var(--fg)",
                              background: active
                                ? "rgba(232,165,75,0.1)"
                                : "transparent",
                            }}
                            onClick={() => setOpen(false)}
                            aria-current={active ? "page" : undefined}
                          >
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center"
                              style={{
                                color: active
                                  ? "var(--accent)"
                                  : "var(--muted)",
                              }}
                            >
                              <MenuEntryIcon name={item.icon} />
                            </span>
                            <span>{t(item.labelKey)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border-t border-[color:var(--line)] p-2">
            <div className="mb-1 flex items-center justify-end px-2 py-1">
              <LanguageSwitcher compact />
            </div>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-white/5"
              onClick={() => setAccountOpen((v) => !v)}
              aria-expanded={accountOpen}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[color:var(--muted)]">
                <NavIcon name="account" size={18} />
              </span>
              <span className="flex-1">{tc("account")}</span>
              <TinyChevron open={accountOpen} />
            </button>
            {accountOpen && (
              <div className="mx-1 mb-1 mt-1 space-y-1 rounded-xl border border-[color:var(--line)] bg-black/20 px-3 py-2.5">
                <p className="text-[11px] text-[color:var(--muted)]">
                  {ts("signedIn")}
                </p>
                <p className="truncate text-sm font-medium">
                  {email || tc("account")}
                </p>
                <form action="/auth/signout" method="post" className="pt-1">
                  <button
                    type="submit"
                    className="w-full rounded-lg py-2 text-left text-sm text-[color:var(--muted)] transition hover:text-[color:var(--fg)]"
                  >
                    {tc("signOut")}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelsQueryOpener() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { setMenuOpen } = useChannelsMenu();

  useEffect(() => {
    const channels = searchParams.get("channels");
    if (channels === "add" || channels === "1") {
      setMenuOpen(true);
      router.replace(pathname);
    }
  }, [searchParams, pathname, router, setMenuOpen]);

  return null;
}

export function AppShell({
  email,
  children,
}: {
  email?: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const locks = useProductLocks();
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerH, setHeaderH] = useState(56);
  const headerRef = useRef<HTMLElement | null>(null);
  const isLibrary = pathname.startsWith("/dashboard/favorites");
  const isClipping = pathname.startsWith("/dashboard/clipping");
  const isCreativity = pathname.startsWith("/dashboard/content");
  const isAiPresentationPath = pathname.startsWith(
    "/dashboard/creators/ai-presentation",
  );
  const isAiPresentation =
    isAiPresentationPath &&
    !isFeatureLocked(locks, "ai_presentation") &&
    !isFeatureLocked(locks, "presentation_editor");
  const isEditor =
    pathname.startsWith("/dashboard/editor") ||
    pathname.startsWith("/dashboard/creators/presentation") ||
    pathname.startsWith("/dashboard/creators/photo-editor");
  const assetsLibraryKind = pathname.match(
    /^\/dashboard\/creators\/library\/([^/]+)/,
  )?.[1];
  const assetsLibraryTitle =
    assetsLibraryKind === "photos"
      ? t("photos")
      : assetsLibraryKind === "videos"
        ? t("videos")
        : assetsLibraryKind === "models"
          ? t("models3d")
          : assetsLibraryKind === "hdris"
            ? t("hdris")
            : assetsLibraryKind === "textures"
              ? t("textures")
              : assetsLibraryKind === "emojis"
                ? t("emojis")
                : assetsLibraryKind === "icons"
                  ? t("icons")
                  : null;
  const activeNav = ALL_NAV.find((item) => isNavActive(pathname, item));
  const pageTitle =
    (activeNav ? t(activeNav.labelKey) : null) ||
    assetsLibraryTitle ||
    (isAiPresentationPath ? t("aiPresentation") : "OrzuAi");
  const ctx = { menuOpen, setMenuOpen };

  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const apply = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      setHeaderH(h);
      document.documentElement.style.setProperty("--app-header-height", `${h}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--app-header-height");
    };
  }, [pathname, isLibrary, isClipping, isCreativity, isAiPresentation]);

  if (isEditor) {
    return (
      <ChannelsContext.Provider value={ctx}>
        <div className="min-h-screen w-full bg-[color:var(--bg)]">{children}</div>
      </ChannelsContext.Provider>
    );
  }

  return (
    <ChannelsContext.Provider value={ctx}>
      <MusicUploadProvider>
        <div className="flex min-h-screen w-full flex-col bg-[color:var(--bg)]">
          <Suspense fallback={null}>
            <ChannelsQueryOpener />
            <ChannelTransferModal />
            <NoYoutubeChannelModal />
          </Suspense>

          <header
            ref={headerRef}
            className="fixed inset-x-0 top-0 z-[80] border-b border-[color:var(--line)] bg-[color:var(--bg)]"
          >
            <div className="relative flex h-14 items-center justify-between gap-3 px-3 sm:h-[5.75rem] sm:px-4 md:h-[6.25rem] md:px-6">
              <BrandLogo
                href="/dashboard"
                size={32}
                withWordmark={false}
                className="lg:hidden"
              />
              <span className="hidden lg:inline-flex">
                <BrandLogo href="/dashboard" size={40} />
              </span>

              {/* Desktop / tablet top nav */}
              <nav className="pointer-events-none absolute inset-0 hidden items-center justify-center pt-3 lg:flex lg:pt-4">
                <div className="pointer-events-auto flex max-w-[min(100%,36rem)] items-stretch justify-center gap-1 overflow-x-auto px-2 md:gap-2">
                  {PRIMARY_NAV.map((item) => {
                    const active = isNavActive(pathname, item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex min-w-[5.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-center text-xs font-semibold leading-tight transition md:min-w-[6.5rem] md:px-4 md:py-2.5 md:text-sm"
                        style={{
                          color: active ? "var(--fg)" : "var(--muted)",
                          background: active
                            ? "rgba(255,255,255,0.07)"
                            : "transparent",
                          boxShadow: active
                            ? "inset 0 1px 0 rgba(255,255,255,0.1)"
                            : undefined,
                        }}
                        aria-current={active ? "page" : undefined}
                      >
                        <span className="flex h-5 w-5 items-center justify-center">
                          <NavIcon name={item.icon} active={active} size={20} />
                        </span>
                        <span>{t(item.labelKey)}</span>
                      </Link>
                    );
                  })}
                </div>
              </nav>

              {/* Compact title on small screens — hide on Clipping (title sits above tabs) */}
              <p
                className={`min-w-0 flex-1 truncate text-center text-sm font-semibold tracking-tight lg:hidden ${
                  isClipping ? "invisible" : ""
                }`}
                aria-hidden={isClipping || undefined}
              >
                {pageTitle}
              </p>

              <div className="relative z-10 shrink-0">
                <Suspense fallback={null}>
                  <AppMenu email={email} />
                </Suspense>
              </div>
            </div>

            {(isLibrary || isClipping || isCreativity || isAiPresentation) && (
              <div
                className={`flex flex-col items-center px-3 pb-2.5 sm:px-4 sm:pb-3 md:px-6 ${
                  isClipping || isCreativity || isLibrary || isAiPresentation
                    ? "w-full"
                    : "gap-3"
                }`}
              >
                {isClipping && (
                  <h1
                    className="mb-2 w-full text-center font-[family-name:var(--font-syne)] text-xl tracking-tight lg:hidden"
                    style={{ fontWeight: 800 }}
                  >
                    {t("aiClipping")}
                  </h1>
                )}
                <div
                  className={`flex w-full items-center ${
                    isClipping || isCreativity || isLibrary || isAiPresentation
                      ? "justify-center"
                      : "gap-3"
                  }`}
                >
                {isLibrary ? (
                  <Suspense
                    fallback={
                      <div className="h-10 w-full max-w-3xl rounded-full border border-[color:var(--line)] bg-[color:var(--bg-elevated)] sm:rounded-xl" />
                    }
                  >
                    <LibraryHeaderTabs />
                  </Suspense>
                ) : isClipping ? (
                  <Suspense
                    fallback={
                      <div className="h-10 w-full max-w-2xl rounded-full border border-[color:var(--line)] bg-[color:var(--bg-elevated)] sm:rounded-xl" />
                    }
                  >
                    <ClippingHeaderTabs />
                  </Suspense>
                ) : isAiPresentation ? (
                  <Suspense
                    fallback={
                      <div className="h-10 w-full max-w-2xl rounded-full border border-[color:var(--line)] bg-[color:var(--bg-elevated)] sm:rounded-xl" />
                    }
                  >
                    <AiPresentationHeaderTabs />
                  </Suspense>
                ) : (
                  <Suspense
                    fallback={
                      <div className="h-10 w-full max-w-2xl rounded-full border border-[color:var(--line)] bg-[color:var(--bg-elevated)] sm:rounded-xl" />
                    }
                  >
                    <CreativityHeaderTabs />
                  </Suspense>
                )}
                </div>
              </div>
            )}
          </header>

          <main
            className="min-w-0 flex-1 px-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pb-4 sm:pt-4 lg:px-6 lg:pb-5 lg:pt-5"
            style={{ paddingTop: `calc(${headerH}px + 0.75rem)` }}
          >
            {children}
          </main>

          <MobileBottomNav />
          <MusicUploadDock />
          <ClippingProgressDock />
        </div>
      </MusicUploadProvider>
    </ChannelsContext.Provider>
  );
}

/** @deprecated use AppShell — kept for import compatibility */
export const SidebarShell = AppShell;
