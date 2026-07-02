"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  KeyRoundIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import {
  createAiCredentialAction,
  deleteAiCredentialAction,
  updateAiCredentialAction,
  type AiCredentialView,
} from "@/features/ai-management/platform-actions";
import { syncVercelSecretsAction } from "@/features/secrets/actions";
import {
  PLATFORM_AI_PROVIDERS,
  getProviderLabel,
  type PlatformAiProvider,
} from "@orzu/platform-ai";
import { cn } from "@/lib/utils";

type AiGeneralApiPanelProps = {
  initialCredentials: AiCredentialView[];
};

const PROVIDER_BADGE: Record<PlatformAiProvider, string> = {
  gemini: "bg-blue-500/10 text-blue-700",
  openai: "bg-emerald-500/10 text-emerald-700",
  claude: "bg-orange-500/10 text-orange-700",
  elevenlabs: "bg-violet-500/10 text-violet-700",
  deepgram: "bg-cyan-500/10 text-cyan-700",
};

export function AiGeneralApiPanel({
  initialCredentials,
}: AiGeneralApiPanelProps) {
  const router = useRouter();
  const [credentials, setCredentials] = useState(initialCredentials);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    provider: "openai" as PlatformAiProvider,
    apiKey: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    provider: "openai" as PlatformAiProvider,
    apiKey: "",
    isActive: true,
  });

  const grouped = useMemo(() => {
    return PLATFORM_AI_PROVIDERS.map((provider) => ({
      provider,
      items: credentials.filter((entry) => entry.provider === provider),
    })).filter((group) => group.items.length > 0);
  }, [credentials]);

  function resetCreateForm() {
    setForm({ name: "", provider: "openai", apiKey: "" });
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createAiCredentialAction(form);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("API ключ добавлен в защищённое хранилище.");
      resetCreateForm();
      router.refresh();
    });
  }

  function startEdit(credential: AiCredentialView) {
    setEditingId(credential.id);
    setEditForm({
      name: credential.name,
      provider: credential.provider as PlatformAiProvider,
      apiKey: "",
      isActive: credential.isActive,
    });
  }

  function handleUpdate() {
    if (!editingId) {
      return;
    }

    startTransition(async () => {
      const result = await updateAiCredentialAction({
        id: editingId,
        ...editForm,
        apiKey: editForm.apiKey.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Ключ обновлён.");
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDelete(credentialId: string) {
    if (!window.confirm("Удалить этот API ключ? Сценарии потеряют доступ.")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteAiCredentialAction(credentialId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Ключ удалён.");
      setCredentials((current) =>
        current.filter((entry) => entry.id !== credentialId),
      );
    });
  }

  function handleVercelSync() {
    startTransition(async () => {
      const result = await syncVercelSecretsAction();

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      const { targetProject } = result.result;

      toast.success(
        `Ключи синхронизированы из Vercel проекта «${targetProject.name}».`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <ShieldCheckIcon className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">General API AI</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Все ключи хранятся зашифрованно на сервере. Синхронизируйте из{" "}
              <Link href="/settings/secrets" className="text-primary underline">
                API ключей
              </Link>{" "}
              или нажмите кнопку ниже — OpenAI, Gemini, ElevenLabs и др.
              появятся автоматически.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleVercelSync}
          className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {isPending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="size-4" />
          )}
          Синхронизация с Vercel
        </button>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold">Добавить API ключ</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Название</span>
            <input
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="Production OpenAI"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Поставщик</span>
            <select
              className="w-full rounded-md border bg-background px-3 py-2"
              value={form.provider}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  provider: event.target.value as PlatformAiProvider,
                }))
              }
            >
              {PLATFORM_AI_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {getProviderLabel(provider)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">API ключ</span>
            <input
              type="password"
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="sk-..."
              value={form.apiKey}
              onChange={(event) =>
                setForm((current) => ({ ...current, apiKey: event.target.value }))
              }
            />
          </label>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleCreate}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <PlusIcon className="size-4" />
          )}
          Сохранить ключ
        </button>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Сохранённые ключи</h3>

        {credentials.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Пока нет ключей. Добавьте OpenAI, Gemini, Claude, ElevenLabs или
            Deepgram.
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.provider} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {getProviderLabel(group.provider)}
              </p>
              {group.items.map((credential) => (
                <article
                  key={credential.id}
                  className="rounded-xl border bg-background p-4"
                >
                  {editingId === credential.id ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        className="rounded-md border px-3 py-2 text-sm"
                        value={editForm.name}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                      <select
                        className="rounded-md border px-3 py-2 text-sm"
                        value={editForm.provider}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            provider: event.target.value as PlatformAiProvider,
                          }))
                        }
                      >
                        {PLATFORM_AI_PROVIDERS.map((provider) => (
                          <option key={provider} value={provider}>
                            {getProviderLabel(provider)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="password"
                        className="rounded-md border px-3 py-2 text-sm md:col-span-2"
                        placeholder="Новый ключ (оставьте пустым, чтобы не менять)"
                        value={editForm.apiKey}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            apiKey: event.target.value,
                          }))
                        }
                      />
                      <label className="flex items-center gap-2 text-sm md:col-span-2">
                        <input
                          type="checkbox"
                          checked={editForm.isActive}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              isActive: event.target.checked,
                            }))
                          }
                        />
                        Активен
                      </label>
                      <div className="flex gap-2 md:col-span-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={handleUpdate}
                          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-md border px-3 py-2 text-sm"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <KeyRoundIcon className="size-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{credential.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {credential.secretKeyName}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-xs font-medium",
                          PROVIDER_BADGE[credential.provider as PlatformAiProvider],
                        )}
                      >
                        {getProviderLabel(
                          credential.provider as PlatformAiProvider,
                        )}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-xs",
                          credential.configured
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-amber-500/10 text-amber-700",
                        )}
                      >
                        {credential.configured ? "Настроен" : "Ключ отсутствует"}
                      </span>
                      {!credential.isActive ? (
                        <span className="rounded-full bg-muted px-2 py-1 text-xs">
                          Выключен
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => startEdit(credential)}
                        className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(credential.id)}
                        className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/5"
                      >
                        <Trash2Icon className="size-4" />
                        Удалить
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
