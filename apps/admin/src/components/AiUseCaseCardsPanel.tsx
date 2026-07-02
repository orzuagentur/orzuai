"use client";

import { useMemo, useState, useTransition } from "react";
import { BotIcon, Loader2Icon, SaveIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import {
  saveAiUseCaseConfigAction,
  type AiCredentialView,
  type AiUseCaseCardView,
} from "@/features/ai-management/platform-actions";
import {
  getDefaultModelForProvider,
  getModelsForProvider,
  getProviderLabel,
  isLlmProvider,
  type PlatformAiProvider,
} from "@orzu/platform-ai";
import { cn } from "@/lib/utils";

type AiUseCaseCardsPanelProps = {
  initialCards: AiUseCaseCardView[];
  credentials: AiCredentialView[];
  categories: Array<{ id: string; label: string }>;
};

type CardDraft = {
  provider: PlatformAiProvider;
  model: string;
  credentialId: string | null;
};

export function AiUseCaseCardsPanel({
  initialCards,
  credentials,
  categories,
}: AiUseCaseCardsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, CardDraft>>(() =>
    Object.fromEntries(
      initialCards.map((card) => [
        card.definition.id,
        {
          provider: (card.config?.provider ??
            card.definition.defaultProvider) as PlatformAiProvider,
          model:
            card.config?.model ??
            card.definition.defaultModel ??
            (isLlmProvider(card.definition.defaultProvider)
              ? getDefaultModelForProvider(card.definition.defaultProvider)
              : ""),
          credentialId: card.config?.credentialId ?? null,
        },
      ]),
    ),
  );

  const credentialsByProvider = useMemo(() => {
    const map = new Map<string, AiCredentialView[]>();

    for (const credential of credentials.filter(
      (entry) => entry.isActive && entry.configured,
    )) {
      const list = map.get(credential.provider) ?? [];
      list.push(credential);
      map.set(credential.provider, list);
    }

    return map;
  }, [credentials]);

  function updateDraft(useCaseId: string, patch: Partial<CardDraft>) {
    setDrafts((current) => {
      const existing = current[useCaseId];
      if (!existing) {
        return current;
      }

      const next = { ...existing, ...patch };

      if (patch.provider && patch.provider !== existing.provider) {
        next.model = isLlmProvider(patch.provider)
          ? getDefaultModelForProvider(patch.provider)
          : "";
        next.credentialId =
          credentialsByProvider.get(patch.provider)?.[0]?.id ?? null;
      }

      return { ...current, [useCaseId]: next };
    });
  }

  function handleSave(useCaseId: string) {
    const draft = drafts[useCaseId];

    if (!draft) {
      return;
    }

    startTransition(async () => {
      const result = await saveAiUseCaseConfigAction({
        useCaseId,
        provider: draft.provider,
        model: draft.model || null,
        credentialId: draft.credentialId,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Сценарий сохранён.");
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Модели по сценариям</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Для каждого типа AI-действия выберите поставщика и модель. API ключ
          подтягивается из вкладки{" "}
          <Link href="/ai-management/credentials" className="text-primary underline">
            General API AI
          </Link>
          .
        </p>
      </section>

      {categories.map((category) => {
        const cards = initialCards.filter(
          (card) => card.definition.category === category.id,
        );

        if (cards.length === 0) {
          return null;
        }

        return (
          <section key={category.id} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {category.label}
            </h3>
            <div className="grid gap-4 lg:grid-cols-2">
              {cards.map((card) => {
                const draft = drafts[card.definition.id];
                const providerCredentials =
                  credentialsByProvider.get(draft.provider) ?? [];
                const models = isLlmProvider(draft.provider)
                  ? getModelsForProvider(draft.provider)
                  : [];
                const providerReady = providerCredentials.length > 0;

                return (
                  <article
                    key={card.definition.id}
                    className="rounded-xl border bg-card p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-muted p-2">
                        <BotIcon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium">{card.definition.label}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {card.definition.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <label className="space-y-1 text-sm">
                        <span className="text-muted-foreground">Поставщик</span>
                        <select
                          className="w-full rounded-md border bg-background px-3 py-2"
                          value={draft.provider}
                          onChange={(event) =>
                            updateDraft(card.definition.id, {
                              provider: event.target.value as PlatformAiProvider,
                            })
                          }
                        >
                          {card.definition.supportedProviders.map((provider) => (
                            <option key={provider} value={provider}>
                              {getProviderLabel(provider as PlatformAiProvider)}
                            </option>
                          ))}
                        </select>
                      </label>

                      {card.definition.kind === "llm" ? (
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">Модель</span>
                          <select
                            className="w-full rounded-md border bg-background px-3 py-2"
                            value={draft.model}
                            onChange={(event) =>
                              updateDraft(card.definition.id, {
                                model: event.target.value,
                              })
                            }
                          >
                            {models.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                          Для этого сценария используется API-ключ поставщика без
                          выбора LLM-модели.
                        </p>
                      )}

                      {providerCredentials.length > 1 ? (
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">
                            Какой ключ использовать
                          </span>
                          <select
                            className="w-full rounded-md border bg-background px-3 py-2"
                            value={draft.credentialId ?? ""}
                            onChange={(event) =>
                              updateDraft(card.definition.id, {
                                credentialId: event.target.value || null,
                              })
                            }
                          >
                            {providerCredentials.map((credential) => (
                              <option key={credential.id} value={credential.id}>
                                {credential.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-xs",
                            providerReady
                              ? "bg-emerald-500/10 text-emerald-700"
                              : "bg-amber-500/10 text-amber-700",
                          )}
                        >
                          {providerReady
                            ? "Ключ найден в General API"
                            : "Добавьте ключ в General API AI"}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isPending || !providerReady}
                        onClick={() => handleSave(card.definition.id)}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isPending ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <SaveIcon className="size-4" />
                        )}
                        Сохранить
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
