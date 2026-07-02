import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BotIcon,
  EyeIcon,
  MessageSquareIcon,
  PhoneIcon,
  ShieldAlertIcon,
} from "lucide-react";

import type { PlatformPreviewData } from "@/services/platform-preview.service";

type PlatformPreviewPanelProps = {
  data: PlatformPreviewData;
};

export function PlatformPreviewPanel({ data }: PlatformPreviewPanelProps) {
  const { business } = data;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <EyeIcon className="size-4" />
          Read-only preview · OrzuX Platform
        </div>
        <p className="mt-1 text-muted-foreground">
          Открыто оператором {data.tokenAdminEmail}. Изменения недоступны — только
          просмотр для отладки tenant.
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{business.businessName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {business.ownerEmail ?? business.email ?? "—"} · {business.subscriptionPlan} ·{" "}
          {business.subscriptionStatus}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PreviewStat
          label="Сообщений 30д"
          value={String(business.stats.messages30d)}
          icon={MessageSquareIcon}
        />
        <PreviewStat
          label="AI расход 30д"
          value={`$${business.stats.aiCostUsd30d.toFixed(2)}`}
          icon={BotIcon}
        />
        <PreviewStat
          label="Звонков 30д"
          value={String(business.stats.voiceCalls30d)}
          icon={PhoneIcon}
        />
        <PreviewStat
          label="Каналов"
          value={String(business.stats.connectedChannels)}
          icon={ShieldAlertIcon}
        />
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-medium">Контакты</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{business.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Телефон</dt>
              <dd>{business.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Сайт</dt>
              <dd className="truncate">{business.website ?? "—"}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-medium">Platform controls</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Статус</dt>
              <dd>{business.controls?.accountStatus ?? "active"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">AI</dt>
              <dd>{business.controls?.aiEnabled ? "on" : "off"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Voice</dt>
              <dd>{business.controls?.voiceEnabled ? "on" : "off"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">SMS</dt>
              <dd>{business.controls?.smsEnabled ? "on" : "off"}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-medium">Каналы</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {business.channels.map((channel) => (
            <div key={channel.channel} className="rounded-lg border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>{channel.label}</span>
                <span>{channel.connected ? "OK" : channel.status}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-medium">Недавние диалоги</h2>
        {data.recentConversations.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Диалогов пока нет.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {data.recentConversations.map((conversation) => (
              <li
                key={conversation.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span>
                  {conversation.channel} · {conversation.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(conversation.updatedAt).toLocaleString("ru-RU")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Это preview-only режим. Для полного управления используйте{" "}
        <Link href="https://admin.orzux.com" className="text-primary hover:underline">
          OrzuX Admin
        </Link>
        .
      </p>
    </div>
  );
}

function PreviewStat(props: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  const Icon = props.icon;

  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <p className="text-xs">{props.label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold">{props.value}</p>
    </article>
  );
}
