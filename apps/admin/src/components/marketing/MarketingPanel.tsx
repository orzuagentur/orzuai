"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  BarChart3Icon,
  EyeIcon,
  MailIcon,
  MousePointerClickIcon,
  SendIcon,
  SparklesIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  fetchMarketingAnalyticsAction,
  fetchMarketingBusinessesAction,
  fetchMarketingCampaignDetailAction,
  fetchMarketingTemplateAction,
  previewMarketingEmailAction,
  saveMarketingTemplateAction,
  sendMarketingCampaignAction,
} from "@/features/marketing/actions";
import { MARKETING_FROM_OPTIONS } from "@/features/marketing/constants";
import type {
  MarketingAnalyticsOverview,
  MarketingBusinessRecipient,
  MarketingCampaignDetail,
  MarketingTemplate,
} from "@/features/marketing/types";
import { formatAdminDateTime } from "@/lib/format-datetime";

type TabId = "compose" | "analytics";

const STATUS_LABELS: Record<string, string> = {
  sent: "Отправлено",
  opened: "Открыто",
  clicked: "Клик",
  failed: "Ошибка",
  pending: "В очереди",
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "default"> = {
  sent: "default",
  opened: "success",
  clicked: "success",
  failed: "danger",
  pending: "warning",
};

function linesToFeatures(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function featuresToLines(features: string[]): string {
  return features.join("\n");
}

function parseManualEmails(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\n,;]+/)
        .map((item) => item.trim().toLowerCase())
        .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)),
    ),
  ];
}

export function MarketingPanel() {
  const [tab, setTab] = useState<TabId>("compose");
  const [isPending, startTransition] = useTransition();

  const [template, setTemplate] = useState<MarketingTemplate | null>(null);
  const [name, setName] = useState("");
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [headline, setHeadline] = useState("");
  const [greeting, setGreeting] = useState("Здравствуйте");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Посмотреть возможности");
  const [ctaUrl, setCtaUrl] = useState("https://www.orzux.com/dashboard");
  const [fromEmail, setFromEmail] = useState("hello");
  const [featuresText, setFeaturesText] = useState("");
  const [previewName, setPreviewName] = useState("Алексей");

  const [previewSubject, setPreviewSubject] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewFrom, setPreviewFrom] = useState("");

  const [sendOpen, setSendOpen] = useState(false);
  const [manualEmails, setManualEmails] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [sendFromEmail, setSendFromEmail] = useState("hello");
  const [businesses, setBusinesses] = useState<MarketingBusinessRecipient[]>([]);
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<Set<string>>(
    new Set(),
  );
  const [businessSearch, setBusinessSearch] = useState("");

  const [analytics, setAnalytics] = useState<MarketingAnalyticsOverview | null>(
    null,
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [campaignDetail, setCampaignDetail] =
    useState<MarketingCampaignDetail | null>(null);

  const templateInput = useMemo(
    () => ({
      name,
      subjectTemplate,
      headline,
      greeting,
      bodyTemplate,
      ctaLabel,
      ctaUrl,
      fromEmail,
      featureHighlights: linesToFeatures(featuresText),
    }),
    [
      name,
      subjectTemplate,
      headline,
      greeting,
      bodyTemplate,
      ctaLabel,
      ctaUrl,
      fromEmail,
      featuresText,
    ],
  );

  const filteredBusinesses = useMemo(() => {
    const query = businessSearch.trim().toLowerCase();

    if (!query) {
      return businesses;
    }

    return businesses.filter(
      (item) =>
        item.businessName.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query),
    );
  }, [businesses, businessSearch]);

  const loadTemplate = useCallback(() => {
    startTransition(async () => {
      const result = await fetchMarketingTemplateAction();

      if (!result.success || !result.template) {
        toast.error(result.message ?? "Не удалось загрузить шаблон");
        return;
      }

      const item = result.template;
      setTemplate(item);
      setName(item.name);
      setSubjectTemplate(item.subjectTemplate);
      setHeadline(item.headline);
      setGreeting(item.greeting);
      setBodyTemplate(item.bodyTemplate);
      setCtaLabel(item.ctaLabel);
      setCtaUrl(item.ctaUrl);
      setFromEmail(item.fromEmail);
      setFeaturesText(featuresToLines(item.featureHighlights));
      setSendFromEmail(item.fromEmail);
    });
  }, []);

  const loadAnalytics = useCallback(() => {
    startTransition(async () => {
      const result = await fetchMarketingAnalyticsAction();

      if (!result.success || !result.analytics) {
        toast.error(result.message ?? "Не удалось загрузить аналитику");
        return;
      }

      setAnalytics(result.analytics);
      setSelectedCampaignId((current) => current ?? result.analytics?.campaigns[0]?.id ?? null);
    });
  }, []);

  const refreshPreview = useCallback(() => {
    startTransition(async () => {
      const result = await previewMarketingEmailAction({
        template: templateInput,
        recipientName: previewName,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setPreviewSubject(result.subject ?? "");
      setPreviewHtml(result.html ?? "");
      setPreviewFrom(result.from ?? "");
    });
  }, [previewName, templateInput]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  useEffect(() => {
    if (tab === "analytics") {
      loadAnalytics();
    }
  }, [tab, loadAnalytics]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (template) {
        refreshPreview();
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [template, refreshPreview]);

  useEffect(() => {
    if (!sendOpen) {
      return;
    }

    startTransition(async () => {
      const result = await fetchMarketingBusinessesAction();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setBusinesses(result.businesses ?? []);
    });
  }, [sendOpen]);

  useEffect(() => {
    if (!selectedCampaignId || tab !== "analytics") {
      setCampaignDetail(null);
      return;
    }

    startTransition(async () => {
      const result = await fetchMarketingCampaignDetailAction(selectedCampaignId);

      if (!result.success || !result.campaign) {
        toast.error(result.message);
        return;
      }

      setCampaignDetail(result.campaign);
    });
  }, [selectedCampaignId, tab]);

  const handleSaveTemplate = () => {
    startTransition(async () => {
      const result = await saveMarketingTemplateAction(templateInput);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Шаблон сохранён");
      loadTemplate();
    });
  };

  const toggleBusiness = (businessId: string) => {
    setSelectedBusinessIds((current) => {
      const next = new Set(current);

      if (next.has(businessId)) {
        next.delete(businessId);
      } else {
        next.add(businessId);
      }

      return next;
    });
  };

  const handleSend = () => {
    const manual = parseManualEmails(manualEmails);
    const fromBusinesses = businesses
      .filter((item) => selectedBusinessIds.has(item.id))
      .map((item) => ({
        email: item.email,
        name: item.businessName,
        businessId: item.id,
      }));

    const merged = new Map<string, { email: string; name: string; businessId?: string }>();

    for (const item of [...fromBusinesses, ...manual.map((email) => ({ email, name: email.split("@")[0] ?? "коллега" }))]) {
      merged.set(item.email, item);
    }

    const recipients = [...merged.values()];

    if (recipients.length === 0) {
      toast.error("Добавьте хотя бы один email");
      return;
    }

    startTransition(async () => {
      const result = await sendMarketingCampaignAction({
        campaignName,
        fromEmail: sendFromEmail,
        template: templateInput,
        recipients: recipients.map((item) => ({
          email: item.email,
          name: item.name,
          businessId: item.businessId ?? null,
        })),
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message ?? "Рассылка отправлена");
      setSendOpen(false);
      setManualEmails("");
      setSelectedBusinessIds(new Set());
      setTab("analytics");
      loadAnalytics();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Маркетинг"
        description="Красивые маркетинговые письма для бизнесов OrzuX с отслеживанием открытий и кликов"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("compose")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === "compose" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              Письмо
            </button>
            <button
              type="button"
              onClick={() => setTab("analytics")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${tab === "analytics" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              Аналитика
            </button>
          </div>
        }
      />

      {tab === "compose" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
          <SectionCard
            title="Шаблон письма"
            description="Меняйте обращение, текст, возможности платформы и кнопку. {{name}} подставит имя получателя."
          >
            <div className="grid gap-4">
              <label className="block space-y-1">
                <span className="text-sm font-medium">Название шаблона</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">Тема письма</span>
                <input
                  value={subjectTemplate}
                  onChange={(event) => setSubjectTemplate(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="{{name}}, откройте новые возможности OrzuX"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Обращение</span>
                  <input
                    value={greeting}
                    onChange={(event) => setGreeting(event.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">Имя в превью</span>
                  <input
                    value={previewName}
                    onChange={(event) => setPreviewName(event.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-sm font-medium">Заголовок</span>
                <input
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">Маркетинговый текст</span>
                <textarea
                  value={bodyTemplate}
                  onChange={(event) => setBodyTemplate(event.target.value)}
                  rows={6}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">Возможности платформы (по одной на строку)</span>
                <textarea
                  value={featuresText}
                  onChange={(event) => setFeaturesText(event.target.value)}
                  rows={5}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Текст кнопки</span>
                  <input
                    value={ctaLabel}
                    onChange={(event) => setCtaLabel(event.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm font-medium">Ссылка кнопки</span>
                  <input
                    value={ctaUrl}
                    onChange={(event) => setCtaUrl(event.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-sm font-medium">Адрес отправителя по умолчанию</span>
                <select
                  value={fromEmail}
                  onChange={(event) => setFromEmail(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  {MARKETING_FROM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSaveTemplate}
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium"
                >
                  <SparklesIcon className="size-4" />
                  Сохранить шаблон
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setSendOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  <SendIcon className="size-4" />
                  Отправить
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Превью"
            description="Так увидит письмо получатель"
            className="xl:sticky xl:top-4 xl:self-start"
          >
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">From:</span>{" "}
                  {previewFrom || "—"}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-foreground">Subject:</span>{" "}
                  {previewSubject || "—"}
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                {previewHtml ? (
                  <iframe
                    title="Marketing email preview"
                    srcDoc={previewHtml}
                    className="h-[720px] w-full border-0 bg-white"
                  />
                ) : (
                  <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                    Загрузка превью...
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      ) : (
        <div className="space-y-6">
          {analytics ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: "Отправлено", value: analytics.totalSent, icon: MailIcon },
                  { label: "Открыто", value: analytics.totalOpened, icon: EyeIcon },
                  { label: "Клики", value: analytics.totalClicked, icon: MousePointerClickIcon },
                  { label: "Игнор", value: analytics.totalIgnored, icon: UsersIcon },
                  { label: "Ошибки", value: analytics.totalFailed, icon: BarChart3Icon },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="rounded-xl border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon className="size-4" />
                        <span className="text-xs font-medium uppercase tracking-wide">
                          {item.label}
                        </span>
                      </div>
                      <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Open rate</p>
                  <p className="mt-1 text-3xl font-semibold">{analytics.openRate}%</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Click rate</p>
                  <p className="mt-1 text-3xl font-semibold">{analytics.clickRate}%</p>
                </div>
              </div>

              <SectionCard title="Кампании" description="История рассылок и эффективность">
                {analytics.campaigns.length === 0 ? (
                  <EmptyState
                    title="Пока нет рассылок"
                    description="Отправьте первое маркетинговое письмо во вкладке «Письмо»."
                  />
                ) : (
                  <div className="space-y-2">
                    {analytics.campaigns.map((campaign) => (
                      <button
                        key={campaign.id}
                        type="button"
                        onClick={() => setSelectedCampaignId(campaign.id)}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${selectedCampaignId === campaign.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatAdminDateTime(campaign.createdAt)} · {campaign.subject}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span>Отпр. {campaign.sentCount}</span>
                            <span>Откр. {campaign.openedCount}</span>
                            <span>Клик {campaign.clickedCount}</span>
                            <span>Игнор {campaign.ignoredCount}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </SectionCard>

              {campaignDetail ? (
                <SectionCard
                  title="Детали кампании"
                  description={`${campaignDetail.name} · open ${campaignDetail.openRate}% · click ${campaignDetail.clickRate}%`}
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="px-2 py-2">Получатель</th>
                          <th className="px-2 py-2">Бизнес</th>
                          <th className="px-2 py-2">Статус</th>
                          <th className="px-2 py-2">Открытия</th>
                          <th className="px-2 py-2">Клики</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaignDetail.recipients.map((recipient) => (
                          <tr key={recipient.id} className="border-b">
                            <td className="px-2 py-2">
                              <p className="font-medium">{recipient.recipientName}</p>
                              <p className="text-xs text-muted-foreground">
                                {recipient.recipientEmail}
                              </p>
                            </td>
                            <td className="px-2 py-2">
                              {recipient.businessName ?? "—"}
                            </td>
                            <td className="px-2 py-2">
                              <StatusBadge
                                tone={STATUS_TONE[recipient.status] ?? "default"}
                                label={STATUS_LABELS[recipient.status] ?? recipient.status}
                              />
                            </td>
                            <td className="px-2 py-2">{recipient.openCount}</td>
                            <td className="px-2 py-2">{recipient.clickCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="Аналитика загружается"
              description="Здесь будут открытия, клики и игноры по каждой рассылке."
            />
          )}
        </div>
      )}

      {sendOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Отправить маркетинговое письмо</h2>
                <p className="text-sm text-muted-foreground">
                  Выберите бизнесы или добавьте email вручную. Каждый клик и открытие будут отслеживаться.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSendOpen(false)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="grid gap-4">
              <label className="block space-y-1">
                <span className="text-sm font-medium">Название кампании</span>
                <input
                  value={campaignName}
                  onChange={(event) => setCampaignName(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="Апрельская рассылка"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">Отправитель</span>
                <select
                  value={sendFromEmail}
                  onChange={(event) => setSendFromEmail(event.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  {MARKETING_FROM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium">Email вручную</span>
                <textarea
                  value={manualEmails}
                  onChange={(event) => setManualEmails(event.target.value)}
                  rows={3}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="owner@business.com, partner@agency.com"
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Бизнесы приложения</span>
                  <input
                    value={businessSearch}
                    onChange={(event) => setBusinessSearch(event.target.value)}
                    className="w-56 rounded-lg border bg-background px-3 py-2 text-sm"
                    placeholder="Поиск..."
                  />
                </div>

                <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border p-2">
                  {filteredBusinesses.length === 0 ? (
                    <p className="px-2 py-4 text-sm text-muted-foreground">
                      Нет бизнесов с email
                    </p>
                  ) : (
                    filteredBusinesses.map((business) => (
                      <label
                        key={business.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBusinessIds.has(business.id)}
                          onChange={() => toggleBusiness(business.id)}
                          className="mt-1"
                        />
                        <span>
                          <span className="block text-sm font-medium">
                            {business.businessName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {business.email} · {business.subscriptionPlan}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSendOpen(false)}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSend}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  <SendIcon className="size-4" />
                  Отправить сейчас
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
