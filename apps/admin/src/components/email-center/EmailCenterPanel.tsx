"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { MailIcon, EyeIcon, PlusIcon, SendHorizonalIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  createEmailTemplateAction,
  fetchEmailCenterDataAction,
  previewEmailTemplateAction,
  saveEmailTemplateAction,
  sendPlatformBroadcastAction,
  sendTestEmailTemplateAction,
} from "@/features/email-center/actions";
import { EMAIL_FROM_PRESET_OPTIONS } from "@/features/email-center/constants";
import type {
  EmailSendLogRow,
  EmailTemplateRow,
} from "@/features/email-center/types";
import { formatAdminDateTime } from "@/lib/format-datetime";

const CATEGORY_LABELS: Record<string, string> = {
  auth: "Auth",
  onboarding: "Onboarding",
  transactional: "Transactional",
  booking: "Booking",
  team: "Team",
  system: "System",
  admin: "Admin",
  billing: "Billing",
};

const PRESET_FROM_KEYS = new Set(["security", "billing", "hello", "noreply"]);

function resolveFromPresetValue(fromEmail: string | null): {
  preset: string;
  customEmail: string;
} {
  if (!fromEmail?.trim()) {
    return { preset: "default", customEmail: "" };
  }

  if (PRESET_FROM_KEYS.has(fromEmail.trim())) {
    return { preset: fromEmail.trim(), customEmail: "" };
  }

  return { preset: "custom", customEmail: fromEmail.trim() };
}

const LOG_STATUS_TONE: Record<string, "success" | "warning" | "danger" | "default"> = {
  sent: "default",
  delivered: "success",
  failed: "danger",
  bounced: "danger",
};

type TabId = "templates" | "log" | "broadcast";

export function EmailCenterPanel() {
  const [tab, setTab] = useState<TabId>("templates");
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [recentLog, setRecentLog] = useState<EmailSendLogRow[]>([]);
  const [stats, setStats] = useState({
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    deliveryRate: 0,
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("system");
  const [editDescription, setEditDescription] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editFromPreset, setEditFromPreset] = useState("default");
  const [editFromCustom, setEditFromCustom] = useState("");
  const [editActive, setEditActive] = useState(true);

  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("system");
  const [newDescription, setNewDescription] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");

  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastActionUrl, setBroadcastActionUrl] = useState("");
  const [broadcastActionLabel, setBroadcastActionLabel] = useState("");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewFrom, setPreviewFrom] = useState("");
  const [testEmail, setTestEmail] = useState("");

  const selectedTemplate = templates.find((item) => item.id === selectedTemplateId) ?? null;

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await fetchEmailCenterDataAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setTemplates(result.templates);
      setRecentLog(result.recentLog);
      setStats(result.stats);

      setSelectedTemplateId((current) => current ?? result.templates[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    setEditName(selectedTemplate.name);
    setEditCategory(selectedTemplate.category);
    setEditDescription(selectedTemplate.description);
    setEditSubject(selectedTemplate.subjectTemplate);
    setEditBody(selectedTemplate.bodyHtmlTemplate ?? "");
    const fromPreset = resolveFromPresetValue(selectedTemplate.fromEmail);
    setEditFromPreset(fromPreset.preset);
    setEditFromCustom(fromPreset.customEmail);
    setEditActive(selectedTemplate.isActive);
  }, [selectedTemplate]);

  const handleSaveTemplate = () => {
    if (!selectedTemplate) {
      return;
    }

    startTransition(async () => {
      const result = await saveEmailTemplateAction({
        id: selectedTemplate.id,
        name: editName,
        category: editCategory,
        description: editDescription,
        subjectTemplate: editSubject,
        bodyHtmlTemplate: editBody || null,
        fromEmail:
          editFromPreset === "custom"
            ? editFromCustom
            : editFromPreset === "default"
              ? null
              : editFromPreset,
        isActive: editActive,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Шаблон сохранён");
      load();
    });
  };

  const handleCreateTemplate = () => {
    startTransition(async () => {
      const result = await createEmailTemplateAction({
        id: newId,
        name: newName,
        category: newCategory,
        description: newDescription,
        subjectTemplate: newSubject,
        bodyHtmlTemplate: newBody || null,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Шаблон создан");
      setNewId("");
      setNewName("");
      setNewDescription("");
      setNewSubject("");
      setNewBody("");
      setSelectedTemplateId(newId.trim());
      load();
    });
  };

  const handleBroadcast = () => {
    if (!broadcastSubject.trim() || !broadcastTitle.trim() || !broadcastBody.trim()) {
      toast.error("Заполните тему, заголовок и текст письма");
      return;
    }

    const confirmed = window.confirm(
      "Отправить официальное письмо всем пользователям платформы?",
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await sendPlatformBroadcastAction({
        subject: broadcastSubject,
        title: broadcastTitle,
        body: broadcastBody,
        actionUrl: broadcastActionUrl.trim() || null,
        actionLabel: broadcastActionLabel.trim() || null,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(`Отправлено: ${result.sent}, ошибок: ${result.failed}`);
      setBroadcastSubject("");
      setBroadcastTitle("");
      setBroadcastBody("");
      setBroadcastActionUrl("");
      setBroadcastActionLabel("");
      load();
    });
  };

  const handlePreviewTemplate = () => {
    if (!selectedTemplate) {
      return;
    }

    startTransition(async () => {
      const result = await previewEmailTemplateAction({
        templateId: selectedTemplate.id,
        subjectOverride: editSubject,
        bodyHtmlOverride: editBody || null,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setPreviewSubject(result.subject);
      setPreviewHtml(result.html);
      setPreviewFrom(result.fromLabel);
      setPreviewOpen(true);
    });
  };

  const handleSendTestEmail = () => {
    if (!selectedTemplate || !testEmail.trim()) {
      return;
    }

    startTransition(async () => {
      const result = await sendTestEmailTemplateAction({
        templateId: selectedTemplate.id,
        toEmail: testEmail,
        subjectOverride: editSubject,
        bodyHtmlOverride: editBody || null,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(`Тест отправлен на ${testEmail.trim()}`);
      load();
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Center"
        description="Шаблоны, статистика доставки, журнал отправок и глобальные рассылки OrzuX"
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <SectionCard title="Отправлено" className="shadow-none">
          <p className="text-2xl font-semibold">{stats.totalSent}</p>
        </SectionCard>
        <SectionCard title="Доставлено" className="shadow-none">
          <p className="text-2xl font-semibold text-emerald-600">{stats.totalDelivered}</p>
        </SectionCard>
        <SectionCard title="Ошибки" className="shadow-none">
          <p className="text-2xl font-semibold text-destructive">{stats.totalFailed}</p>
        </SectionCard>
        <SectionCard title="Доставляемость" className="shadow-none">
          <p className="text-2xl font-semibold">{stats.deliveryRate}%</p>
        </SectionCard>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["templates", "Шаблоны"],
            ["log", "Журнал"],
            ["broadcast", "Рассылка"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              tab === id
                ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                : "rounded-lg border bg-background px-3 py-1.5 text-sm font-medium"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "templates" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <SectionCard
            title="Все шаблоны"
            description="Назначение, отправки и статус каждого шаблона"
            icon={MailIcon}
          >
            <div className="space-y-2">
              {templates.length === 0 ? (
                <EmptyState
                  title="Нет шаблонов"
                  description="Примените миграцию email_center или создайте шаблон вручную."
                />
              ) : (
                templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={
                      selectedTemplateId === template.id
                        ? "w-full rounded-lg border border-primary bg-primary/5 p-3 text-left"
                        : "w-full rounded-lg border p-3 text-left hover:bg-muted/40"
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground">{template.id}</p>
                      </div>
                      <StatusBadge
                        tone={template.isActive ? "success" : "default"}
                        label={template.isActive ? "Active" : "Off"}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{CATEGORY_LABELS[template.category] ?? template.category}</span>
                      <span>·</span>
                      <span>{template.sendCount} отправок</span>
                      <span>·</span>
                      <span>{template.deliveredCount} доставлено</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </SectionCard>

          <div className="space-y-6">
            <SectionCard
              title="Редактирование"
              description="Тема, описание и HTML-override для выбранного шаблона"
            >
              {selectedTemplate ? (
                <div className="space-y-3">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Название</span>
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Категория</span>
                    <select
                      value={editCategory}
                      onChange={(event) => setEditCategory(event.target.value)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Назначение</span>
                    <textarea
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      rows={2}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Тема письма</span>
                    <input
                      value={editSubject}
                      onChange={(event) => setEditSubject(event.target.value)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">HTML override (опционально)</span>
                    <textarea
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                      rows={8}
                      className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs"
                      placeholder="Оставьте пустым, чтобы использовать кодовый шаблон"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Адрес отправителя (From)</span>
                    <select
                      value={editFromPreset}
                      onChange={(event) => setEditFromPreset(event.target.value)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                      {EMAIL_FROM_PRESET_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {editFromPreset === "custom" ? (
                      <input
                        value={editFromCustom}
                        onChange={(event) => setEditFromCustom(event.target.value)}
                        placeholder="billing@orzux.com"
                        className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      />
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Можно выбрать preset или указать свой адрес без изменения кода.
                    </p>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(event) => setEditActive(event.target.checked)}
                    />
                    Шаблон активен
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleSaveTemplate}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handlePreviewTemplate}
                      className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      <EyeIcon className="size-4" />
                      Посмотреть шаблон
                    </button>
                  </div>

                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <p className="text-sm font-medium">Тестовое письмо</p>
                    <p className="text-xs text-muted-foreground">
                      Отправит с адреса шаблона на указанный email. Тема будет с префиксом [TEST].
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(event) => setTestEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        disabled={isPending || !testEmail.trim()}
                        onClick={handleSendTestEmail}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        <SendHorizonalIcon className="size-4" />
                        Отправить тест
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState title="Выберите шаблон" description="Список слева" />
              )}
            </SectionCard>

            <SectionCard
              title="Новый шаблон"
              description="Создайте кастомный шаблон для рассылок и уведомлений"
              icon={PlusIcon}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">ID</span>
                  <input
                    value={newId}
                    onChange={(event) => setNewId(event.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    placeholder="custom_announcement"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Название</span>
                  <input
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Категория</span>
                  <select
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1 md:col-span-2">
                  <span className="text-sm font-medium">Назначение</span>
                  <textarea
                    value={newDescription}
                    onChange={(event) => setNewDescription(event.target.value)}
                    rows={2}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block space-y-1 md:col-span-2">
                  <span className="text-sm font-medium">Тема</span>
                  <input
                    value={newSubject}
                    onChange={(event) => setNewSubject(event.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block space-y-1 md:col-span-2">
                  <span className="text-sm font-medium">HTML</span>
                  <textarea
                    value={newBody}
                    onChange={(event) => setNewBody(event.target.value)}
                    rows={6}
                    className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={isPending || !newId.trim() || !newName.trim()}
                onClick={handleCreateTemplate}
                className="mt-3 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Создать шаблон
              </button>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {tab === "log" ? (
        <SectionCard title="Журнал отправок" description="Последние 200 писем платформы">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Время</th>
                  <th className="py-2 pr-3 font-medium">Шаблон</th>
                  <th className="py-2 pr-3 font-medium">Кому</th>
                  <th className="py-2 pr-3 font-medium">Тема</th>
                  <th className="py-2 pr-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {recentLog.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Пока нет записей
                    </td>
                  </tr>
                ) : (
                  recentLog.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {formatAdminDateTime(entry.createdAt)}
                      </td>
                      <td className="py-2 pr-3">{entry.templateName ?? "—"}</td>
                      <td className="py-2 pr-3">{entry.toEmail}</td>
                      <td className="py-2 pr-3 max-w-[220px] truncate">{entry.subject}</td>
                      <td className="py-2 pr-3">
                        <StatusBadge
                          tone={LOG_STATUS_TONE[entry.status] ?? "default"}
                          label={entry.status}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {tab === "broadcast" ? (
        <SectionCard
          title="Глобальная рассылка"
          description="Официальное письмо всем пользователям платформы с hello@orzux.com"
          icon={SendIcon}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1 md:col-span-2">
              <span className="text-sm font-medium">Тема письма</span>
              <input
                value={broadcastSubject}
                onChange={(event) => setBroadcastSubject(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="Важное обновление OrzuX"
              />
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className="text-sm font-medium">Заголовок в письме</span>
              <input
                value={broadcastTitle}
                onChange={(event) => setBroadcastTitle(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className="text-sm font-medium">Текст</span>
              <textarea
                value={broadcastBody}
                onChange={(event) => setBroadcastBody(event.target.value)}
                rows={8}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Ссылка (опционально)</span>
              <input
                value={broadcastActionUrl}
                onChange={(event) => setBroadcastActionUrl(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Текст кнопки</span>
              <input
                value={broadcastActionLabel}
                onChange={(event) => setBroadcastActionLabel(event.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleBroadcast}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Отправить всем пользователям
          </button>
        </SectionCard>
      ) : null}

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border bg-background shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Предпросмотр шаблона</p>
                <p className="text-xs text-muted-foreground">{previewFrom}</p>
                <p className="text-sm">{previewSubject}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg border px-3 py-1.5 text-sm"
              >
                Закрыть
              </button>
            </div>
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              className="min-h-[480px] w-full flex-1 bg-white"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
