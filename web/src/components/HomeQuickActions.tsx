"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { isFeatureLocked } from "@/lib/product-locks";
import { useProductLocks } from "@/lib/product-locks-client";

type HomeQuickActionsProps = {
  youtubeConnected: boolean;
  isTrained: boolean;
  aiEnabled: boolean;
};

type IconName =
  | "youtube"
  | "train"
  | "schedule"
  | "create"
  | "clip"
  | "videos"
  | "settings"
  | "presentation"
  | "photo"
  | "assets";

type Card = {
  key: string;
  href: string;
  title: string;
  body: string;
  icon: IconName;
};

function YouTubeMark() {
  return (
    <svg width="22" height="16" viewBox="0 0 28 20" aria-hidden>
      <path
        fill="#fff"
        d="M27.43 3.13A3.52 3.52 0 0 0 24.95.64C22.74 0 14 0 14 0S5.26 0 3.05.64A3.52 3.52 0 0 0 .57 3.13 36.8 36.8 0 0 0 0 10a36.8 36.8 0 0 0 .57 6.87 3.52 3.52 0 0 0 2.48 2.49C5.26 20 14 20 14 20s8.74 0 10.95-.64a3.52 3.52 0 0 0 2.48-2.49A36.8 36.8 0 0 0 28 10a36.8 36.8 0 0 0-.57-6.87Z"
      />
      <path fill="#FF0000" d="M11.2 14.29V5.71L18.4 10l-7.2 4.29Z" />
    </svg>
  );
}

function CardIcon({ name }: { name: IconName }) {
  if (name === "youtube") {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF0000]">
        <YouTubeMark />
      </span>
    );
  }

  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.85,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--line)] bg-white/5 text-[color:var(--accent)]">
      {name === "train" && (
        <svg {...common}>
          <path d="M4 19V6.5A2.5 2.5 0 0 1 6.5 4H20v15H6.5A2.5 2.5 0 0 1 4 16.5" />
          <path d="M8 8h8M8 12h6" />
        </svg>
      )}
      {name === "schedule" && (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
          <path d="M12 14v3l2 1" />
        </svg>
      )}
      {name === "create" && (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M10 9.2v5.6L15.5 12 10 9.2Z" fill="currentColor" stroke="none" />
        </svg>
      )}
      {name === "clip" && (
        <svg {...common}>
          <circle cx="7" cy="7" r="2.6" />
          <circle cx="7" cy="17" r="2.6" />
          <path d="M9.2 8.5 18 4M9.2 15.5 18 20M18 4v16" />
        </svg>
      )}
      {name === "videos" && (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="M7 9h4M7 13h3" />
          <path d="M14 9.4v5.2l4.2-2.6L14 9.4Z" fill="currentColor" stroke="none" />
        </svg>
      )}
      {name === "settings" && (
        <svg {...common}>
          <path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5l2.6-1.5M17.2 9l2.6-1.5" />
          <circle cx="12" cy="12" r="3.2" />
        </svg>
      )}
      {name === "presentation" && (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 20h8M12 17v3M7 8h5M7 11h8" />
        </svg>
      )}
      {name === "photo" && (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="2" />
          <path d="M3 16.5 8 12l3.5 3.5L15 12l6 5" />
        </svg>
      )}
      {name === "assets" && (
        <svg {...common}>
          <path d="M4 7h16v12H4z" />
          <path d="M8 7V5h8v2M8 11h8M8 15h5" />
        </svg>
      )}
    </span>
  );
}

function WorkCard({ card }: { card: Card }) {
  return (
    <Link
      href={card.href}
      className="flex min-h-[8.5rem] flex-col gap-2.5 rounded-xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)]/90 p-3.5 text-left transition hover:border-[color:rgba(232,165,75,0.42)] active:scale-[0.98] sm:p-4"
    >
      <CardIcon name={card.icon} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight sm:text-base">
          {card.title}
        </p>
        <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-[color:var(--muted)] sm:text-xs">
          {card.body}
        </p>
      </div>
    </Link>
  );
}

export function HomeQuickActions(props: HomeQuickActionsProps) {
  const t = useTranslations("dashboardHome");
  const locks = useProductLocks();
  const allReady = props.youtubeConnected && props.isTrained && props.aiEnabled;
  const presentationEditorVisible = !isFeatureLocked(
    locks,
    "presentation_editor",
  );
  const aiPresentationVisible =
    !isFeatureLocked(locks, "ai_presentation") && presentationEditorVisible;

  const nextAction = !props.youtubeConnected
    ? {
        href: "/dashboard/channel",
        label: t("primaryConnect"),
        body: t("nextConnect"),
      }
    : !props.isTrained
      ? {
          href: "/dashboard/channel/training?enableAi=1",
          label: t("primaryTrain"),
          body: t("nextTrain"),
        }
      : !props.aiEnabled
        ? {
            href: "/dashboard/channel/training?enableAi=1",
            label: t("primarySchedule"),
            body: t("nextSchedule"),
          }
        : {
            href: "/dashboard/content",
            label: t("primaryCreate"),
            body: t("nextReady"),
          };

  const steps = [
    {
      key: "connect",
      title: t("stepConnectTitle"),
      body: t("stepConnectBody"),
      done: props.youtubeConnected,
      icon: "youtube" as const,
    },
    {
      key: "train",
      title: t("stepTrainTitle"),
      body: t("stepTrainBody"),
      done: props.isTrained,
      icon: "train" as const,
    },
    {
      key: "schedule",
      title: t("stepScheduleTitle"),
      body: t("stepScheduleBody"),
      done: props.aiEnabled,
      icon: "schedule" as const,
    },
    {
      key: "run",
      title: t("stepRunTitle"),
      body: t("stepRunBody"),
      done: allReady,
      icon: "create" as const,
    },
  ];

  const workCards: Card[] = [
    {
      key: "create",
      href: "/dashboard/content",
      title: t("videoTitle"),
      body: t("videoBody"),
      icon: "create",
    },
    {
      key: "clip",
      href: "/dashboard/clipping",
      title: t("clipTitle"),
      body: t("clipBody"),
      icon: "clip",
    },
    {
      key: "youtube",
      href: "/dashboard/channel",
      title: t("youtubeTitle"),
      body: t("videosBody"),
      icon: "youtube",
    },
  ];

  const labCards: Card[] = [
    aiPresentationVisible && {
      key: "ai-presentation",
      href: "/dashboard/creators/ai-presentation",
      title: t("aiPresentationTitle"),
      body: t("aiPresentationBody"),
      icon: "presentation",
    },
    presentationEditorVisible && {
      key: "presentation",
      href: "/dashboard/creators/presentation",
      title: t("presentationTitle"),
      body: t("presentationBody"),
      icon: "presentation",
    },
    !isFeatureLocked(locks, "photo_editor") && {
      key: "photo",
      href: "/dashboard/creators/photo-editor",
      title: t("photoTitle"),
      body: t("photoBody"),
      icon: "photo",
    },
    !isFeatureLocked(locks, "asset_libraries") && {
      key: "assets",
      href: "/dashboard/creators/library/photos",
      title: t("assetsTitle"),
      body: t("assetsBody"),
      icon: "assets",
    },
  ].filter(Boolean) as Card[];

  return (
    <div className="space-y-7">
      <section className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--bg-elevated)]/80 p-4 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">
              {t("kicker")}
            </p>
            <h1
              className="mt-2 font-[family-name:var(--font-syne)] text-3xl tracking-tight sm:text-4xl"
              style={{ fontWeight: 800 }}
            >
              {t("title")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)] sm:text-base">
              {t("lead")}
            </p>
          </div>

          <div className="min-w-[min(100%,22rem)] rounded-xl border border-[color:var(--line)] bg-black/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
              {allReady ? t("readyLabel") : t("nextStep")}
            </p>
            <p className="mt-1 text-sm text-[color:var(--fg)]">{nextAction.body}</p>
            {!allReady && (
              <Link
                href={nextAction.href}
                className="mt-3 inline-flex w-full justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
                style={{ background: "#E8A54B" }}
              >
                {nextAction.label}
              </Link>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-2.5 md:grid-cols-4">
          {steps.map((step, index) => {
            const active = !step.done && steps.slice(0, index).every((s) => s.done);
            return (
              <div
                key={step.key}
                className="rounded-xl border p-3"
                style={{
                  borderColor: step.done
                    ? "rgba(34,197,94,0.35)"
                    : active
                      ? "rgba(232,165,75,0.48)"
                      : "var(--line)",
                  background: step.done
                    ? "rgba(34,197,94,0.08)"
                    : active
                      ? "rgba(232,165,75,0.1)"
                      : "rgba(255,255,255,0.02)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <CardIcon name={step.icon} />
                  <span className="text-xs font-semibold text-[color:var(--muted)]">
                    {step.done ? t("done") : active ? t("current") : `${index + 1}`}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold">{step.title}</p>
                <p className="mt-1 text-[11px] leading-snug text-[color:var(--muted)]">
                  {step.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{t("workTitle")}</h2>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{t("workLead")}</p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {workCards.map((card) => (
            <WorkCard key={card.key} card={card} />
          ))}
        </div>
      </section>

      {labCards.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">{t("labsTitle")}</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              {t("labsLead")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {labCards.map((card) => (
              <WorkCard key={card.key} card={card} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
