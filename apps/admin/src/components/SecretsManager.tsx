"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  WrenchIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteSecretAction,
  revealSecretAction,
  syncVercelSecretsAction,
  testSecretAction,
  upsertSecretAction,
} from "@/features/secrets/actions";
import {
  getSecretKeyHint,
  getSecretPlaceholder,
} from "@/lib/secret-placeholders";
import { formatAdminDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";
import type { AppSecretAuditRecord, AppSecretRecord } from "@orzu/secrets";

type SecretsManagerProps = {
  secrets: AppSecretRecord[];
  auditLog: AppSecretAuditRecord[];
};

type SortKey = "key" | "updated";

export function SecretsManager({ secrets, auditLog }: SecretsManagerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("key");
  const [isPending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState({
    keyName: "",
    value: "",
    description: "",
  });
  const menuRef = useRef<HTMLDivElement | null>(null);

  const valuePlaceholder = useMemo(
    () => getSecretPlaceholder(form.keyName),
    [form.keyName],
  );

  const keyHint = useMemo(() => getSecretKeyHint(form.keyName), [form.keyName]);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function resetForm() {
    setEditingKey(null);
    setForm({ keyName: "", value: "", description: "" });
  }

  function startEdit(secret: AppSecretRecord) {
    setEditingKey(secret.id);
    setOpenMenuId(null);
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
      router.refresh();
    });
  }

  function handleDelete(keyName: string) {
    setOpenMenuId(null);

    if (!window.confirm(`Удалить секрет ${keyName}?`)) {
      return;
    }

    startTransition(async () => {
      await deleteSecretAction(keyName);
      toast.success("Секрет удалён");
      router.refresh();
    });
  }

  function handleReveal(keyName: string) {
    setOpenMenuId(null);

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
    setOpenMenuId(null);
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
    setOpenMenuId(null);

    startTransition(async () => {
      const result = await testSecretAction(keyName);
      toast[result.tested ? "success" : "error"](result.message);
    });
  }

  function handleVercelSync() {
    startTransition(async () => {
      const result = await syncVercelSecretsAction();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      const { secrets, aiCredentials, useCasesLinked, sources, infos, warnings, targetProject } =
        result.result;

      const aiCount =
        aiCredentials.created.length + aiCredentials.updated.length;

      const changedSecrets = secrets.created.length + secrets.updated.length;

      if (changedSecrets > 0 || aiCount > 0) {
        toast.success(
          `Синхронизация из «${targetProject.name}»: ${secrets.created.length} новых, ${secrets.updated.length} обновлено, ${aiCount} AI ключей в General API.`,
        );
      } else {
        toast.message(
          `Синхронизация из «${targetProject.name}» завершена. Новых ключей из Vercel нет.`,
        );
      }

      if (sources.length > 0) {
        toast.message(`Источники: ${sources.join(", ")}`);
      }

      if (useCasesLinked.length > 0) {
        toast.message(`Сценарии AI связаны: ${useCasesLinked.length}`);
      }

      for (const info of infos) {
        toast.message(info);
      }

      for (const warning of warnings) {
        toast.warning(warning);
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">API ключи</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Зашифрованные секреты платформы. «Синхронизация с Vercel» читает
            orzuaibot (orzux.com). На orzuai-admin нужны{" "}
            <code className="text-xs">VERCEL_ACCESS_TOKEN</code> и{" "}
            <code className="text-xs">VERCEL_TEAM_ID</code>. Если ключи уже в
            vault — добавьте вручную ниже.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleVercelSync}
            className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-4" />
            )}
            Синхронизация с Vercel
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <PlusIcon className="size-4" />
            Новый ключ
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
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

          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((secret) => (
              <article
                key={secret.id}
                className="relative rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          secret.isActive
                            ? "bg-emerald-500"
                            : "bg-muted-foreground",
                        )}
                        title={secret.isActive ? "Активен" : "Неактивен"}
                      />
                      <p className="truncate font-mono text-sm font-semibold">
                        {secret.keyName}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {secret.description || "Без описания"}
                    </p>
                  </div>

                  <div className="relative" ref={openMenuId === secret.id ? menuRef : null}>
                    <button
                      type="button"
                      aria-label="Действия"
                      onClick={() =>
                        setOpenMenuId((current) =>
                          current === secret.id ? null : secret.id,
                        )
                      }
                      className="inline-flex size-8 items-center justify-center rounded-lg border hover:bg-muted"
                    >
                      <MoreVerticalIcon className="size-4" />
                    </button>

                    {openMenuId === secret.id ? (
                      <div className="absolute top-9 right-0 z-20 min-w-40 rounded-lg border bg-card p-1 shadow-lg">
                        <MenuAction
                          icon={EyeIcon}
                          label="Показать"
                          onClick={() => handleReveal(secret.keyName)}
                        />
                        <MenuAction
                          icon={CopyIcon}
                          label="Копировать"
                          onClick={() => void handleCopy(secret.keyName)}
                        />
                        <MenuAction
                          icon={CheckIcon}
                          label="Изменить"
                          onClick={() => startEdit(secret)}
                        />
                        <MenuAction
                          icon={WrenchIcon}
                          label="Проверить"
                          onClick={() => handleTest(secret.keyName)}
                        />
                        <MenuAction
                          icon={Trash2Icon}
                          label="Удалить"
                          destructive
                          onClick={() => handleDelete(secret.keyName)}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 font-mono text-sm break-all">
                  {revealed[secret.keyName] ?? secret.maskedValue}
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span>
                    Обновлён {formatAdminDateTime(secret.updatedAt)}
                  </span>
                  {secret.lastUsedAt ? (
                    <span>
                      Использован {formatAdminDateTime(secret.lastUsedAt)}
                    </span>
                  ) : (
                    <span>Ещё не использовался</span>
                  )}
                </div>
              </article>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
              Ключи не найдены
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">
              {editingKey ? "Изменить ключ" : "Добавить ключ"}
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
                placeholder={valuePlaceholder}
                rows={4}
                className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground/70"
              />
              {keyHint ? (
                <p className="text-xs text-muted-foreground">{keyHint}</p>
              ) : null}
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
                    {formatAdminDateTime(entry.createdAt)}
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

function MenuAction({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof EyeIcon;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted",
        destructive ? "text-destructive" : "",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
