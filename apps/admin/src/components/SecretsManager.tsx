"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteSecretAction,
  revealSecretAction,
  testSecretAction,
  upsertSecretAction,
} from "@/features/secrets/actions";
import type { AppSecretAuditRecord, AppSecretRecord } from "@orzu/secrets";

type SecretsManagerProps = {
  secrets: AppSecretRecord[];
  auditLog: AppSecretAuditRecord[];
};

type SortKey = "key" | "updated";

export function SecretsManager({ secrets, auditLog }: SecretsManagerProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("key");
  const [isPending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState({
    keyName: "",
    value: "",
    description: "",
  });

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const list = secrets.filter((secret) => {
      if (!normalized) {
        return true;
      }

      return (
        secret.keyName.toLowerCase().includes(normalized) ||
        secret.description.toLowerCase().includes(normalized)
      );
    });

    return list.sort((left, right) => {
      if (sortKey === "updated") {
        return right.updatedAt.localeCompare(left.updatedAt);
      }

      return left.keyName.localeCompare(right.keyName);
    });
  }, [query, secrets, sortKey]);

  function resetForm() {
    setEditingKey(null);
    setForm({ keyName: "", value: "", description: "" });
  }

  function startEdit(secret: AppSecretRecord) {
    setEditingKey(secret.id);
    setForm({
      keyName: secret.keyName,
      value: "",
      description: secret.description,
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await upsertSecretAction(form);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(`Секрет ${result.secret.keyName} сохранён`);
      resetForm();
      window.location.reload();
    });
  }

  function handleDelete(keyName: string) {
    if (!window.confirm(`Удалить секрет ${keyName}?`)) {
      return;
    }

    startTransition(async () => {
      await deleteSecretAction(keyName);
      toast.success("Секрет удалён");
      window.location.reload();
    });
  }

  function handleReveal(keyName: string) {
    startTransition(async () => {
      const result = await revealSecretAction(keyName);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setRevealed((current) => ({ ...current, [keyName]: result.value }));
      window.setTimeout(() => {
        setRevealed((current) => {
          const next = { ...current };
          delete next[keyName];
          return next;
        });
      }, 12_000);
    });
  }

  async function handleCopy(keyName: string) {
    const cached = revealed[keyName];

    if (cached) {
      await navigator.clipboard.writeText(cached);
      toast.success("Скопировано");
      return;
    }

    startTransition(async () => {
      const result = await revealSecretAction(keyName);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      await navigator.clipboard.writeText(result.value);
      toast.success("Скопировано");
    });
  }

  function handleTest(keyName: string) {
    startTransition(async () => {
      const result = await testSecretAction(keyName);
      toast[result.tested ? "success" : "error"](result.message);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Секреты и API ключи</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Управление зашифрованными секретами платформы. Значения хранятся в
            Supabase и никогда не показываются полностью по умолчанию.
          </p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <PlusIcon className="size-4" />
          Новый секрет
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <label className="relative min-w-[220px] flex-1">
              <SearchIcon className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по названию или описанию"
                className="w-full rounded-lg border bg-background py-2 pr-3 pl-9 text-sm"
              />
            </label>
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="key">По имени</option>
              <option value="updated">По дате изменения</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="hidden grid-cols-[1.4fr_1fr_140px] gap-3 border-b px-4 py-3 text-xs font-medium text-muted-foreground md:grid">
              <span>Ключ</span>
              <span>Значение</span>
              <span>Действия</span>
            </div>
            <ul className="divide-y">
              {filtered.map((secret) => (
                <li
                  key={secret.id}
                  className="grid gap-3 px-4 py-4 md:grid-cols-[1.4fr_1fr_140px] md:items-center"
                >
                  <div>
                    <p className="font-mono text-sm font-medium">{secret.keyName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {secret.description || "Без описания"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Обновлён {new Date(secret.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="font-mono text-sm">
                    {revealed[secret.keyName] ?? secret.maskedValue}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <ActionIcon
                      label="Показать"
                      onClick={() => handleReveal(secret.keyName)}
                      disabled={isPending}
                    >
                      <EyeIcon className="size-3.5" />
                    </ActionIcon>
                    <ActionIcon
                      label="Копировать"
                      onClick={() => void handleCopy(secret.keyName)}
                      disabled={isPending}
                    >
                      <CopyIcon className="size-3.5" />
                    </ActionIcon>
                    <ActionIcon
                      label="Изменить"
                      onClick={() => startEdit(secret)}
                      disabled={isPending}
                    >
                      <CheckIcon className="size-3.5" />
                    </ActionIcon>
                    <ActionIcon
                      label="Проверить"
                      onClick={() => handleTest(secret.keyName)}
                      disabled={isPending}
                    >
                      <WrenchIcon className="size-3.5" />
                    </ActionIcon>
                    <ActionIcon
                      label="Удалить"
                      onClick={() => handleDelete(secret.keyName)}
                      disabled={isPending}
                      destructive
                    >
                      <Trash2Icon className="size-3.5" />
                    </ActionIcon>
                  </div>
                </li>
              ))}
              {filtered.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Секреты не найдены
                </li>
              ) : null}
            </ul>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">
              {editingKey ? "Изменить секрет" : "Создать секрет"}
            </h2>
            <div className="mt-4 space-y-3">
              <input
                value={form.keyName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    keyName: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="SECRET_KEY_NAME"
                disabled={Boolean(editingKey)}
                className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm disabled:opacity-60"
              />
              <textarea
                value={form.value}
                onChange={(event) =>
                  setForm((current) => ({ ...current, value: event.target.value }))
                }
                placeholder="Значение секрета"
                rows={4}
                className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm"
              />
              <input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Описание (опционально)"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={isPending || !form.keyName || !form.value}
                onClick={handleSave}
                className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  "Сохранить"
                )}
              </button>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Журнал изменений</h2>
            <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto text-xs">
              {auditLog.map((entry) => (
                <li key={entry.id} className="rounded-lg bg-muted/40 px-3 py-2">
                  <p className="font-medium">
                    {entry.action} · {entry.keyName}
                  </p>
                  <p className="text-muted-foreground">
                    {entry.actorEmail || "system"} ·{" "}
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ActionIcon({
  children,
  label,
  onClick,
  disabled,
  destructive,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center rounded-lg border hover:bg-muted disabled:opacity-50 ${
        destructive ? "text-destructive" : ""
      }`}
    >
      {children}
    </button>
  );
}
