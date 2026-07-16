import {
  PLATFORM_AI_USE_CASES,
  PLATFORM_AI_USE_CASE_CATEGORIES,
  PLATFORM_PROMPT_KEYS,
  PLATFORM_PROMPT_LABELS,
  type PlatformPromptKey,
} from "@orzu/platform-ai";

import type {
  AiCredentialView,
  AiUseCaseCardView,
} from "@/features/ai-management/platform-view-types";
import type {
  AiStructureFlow,
  AiStructureFlowNode,
  AiStructureLiveData,
  AiStructureLiveStatus,
  AiStructurePromptLive,
  AiStructureUseCaseLive,
} from "@/features/ai-management/types";
import type { PlatformPromptGroup } from "@/features/platform-prompts/types";

const PROMPT_CONSUMERS: Record<
  PlatformPromptKey,
  { useCaseIds: string[]; nodeHint: string }
> = {
  assistant_system: {
    useCaseIds: ["channel_messages"],
    nodeHint: "Системные правила агента в каналах",
  },
  follow_up: {
    useCaseIds: ["follow_up"],
    nodeHint: "Инструкция follow-up агента",
  },
  guard_fallback: {
    useCaseIds: ["channel_messages", "follow_up"],
    nodeHint: "Безопасный fallback после sanitize",
  },
  orchestrator: {
    useCaseIds: ["orchestrator"],
    nodeHint: "План CRM после ответа",
  },
  executor: {
    useCaseIds: ["orchestrator"],
    nodeHint: "Исполнение CRM-действий",
  },
  voice: {
    useCaseIds: ["ai_phone_call"],
    nodeHint: "Правила голосового звонка",
  },
};

function statusFromReady(ready: boolean, partial = false): AiStructureLiveStatus {
  if (ready) {
    return "ready";
  }
  if (partial) {
    return "partial";
  }
  return "missing";
}

function mapUseCaseLive(card: AiUseCaseCardView): AiStructureUseCaseLive {
  const provider = card.config?.provider ?? card.definition.defaultProvider;
  const model = card.config?.model ?? card.definition.defaultModel ?? null;
  const ready = card.selectedCredentialConfigured;
  const hasConfigRow = Boolean(card.config);

  return {
    useCaseId: card.definition.id,
    label: card.definition.label,
    provider,
    model,
    credentialName: null,
    credentialConfigured: ready,
    hasConfigRow,
    status: statusFromReady(ready, hasConfigRow && !ready),
  };
}

function attachCredentialNames(
  useCases: AiStructureUseCaseLive[],
  cards: AiUseCaseCardView[],
  credentials: AiCredentialView[],
): AiStructureUseCaseLive[] {
  return useCases.map((entry) => {
    const card = cards.find((item) => item.definition.id === entry.useCaseId);
    const credentialId = card?.config?.credentialId;
    const credential = credentialId
      ? credentials.find((item) => item.id === credentialId)
      : credentials.find(
          (item) =>
            item.provider === entry.provider &&
            item.isActive &&
            item.configured,
        );

    return {
      ...entry,
      credentialName: credential?.name ?? null,
      credentialConfigured: Boolean(credential?.configured),
      status: statusFromReady(
        Boolean(credential?.configured),
        Boolean(card?.config) && !credential?.configured,
      ),
    };
  });
}

function mapPromptLive(group: PlatformPromptGroup): AiStructurePromptLive {
  const active = group.activeVersion;
  return {
    promptKey: group.promptKey,
    label: group.label,
    activeVersion: active?.version ?? null,
    usageCount: active?.usageCount ?? 0,
    status: active ? "ready" : "missing",
  };
}

function aggregateStatus(
  statuses: AiStructureLiveStatus[],
): AiStructureLiveStatus {
  if (statuses.length === 0) {
    return "static";
  }
  if (statuses.every((status) => status === "ready")) {
    return "ready";
  }
  if (statuses.every((status) => status === "missing")) {
    return "missing";
  }
  return "partial";
}

function enrichArchitectureNode(
  node: AiStructureFlowNode,
  useCaseById: Map<string, AiStructureUseCaseLive>,
  promptByKey: Map<PlatformPromptKey, AiStructurePromptLive>,
): AiStructureFlowNode {
  const useCases = (node.useCaseIds ?? [])
    .map((id) => useCaseById.get(id))
    .filter((entry): entry is AiStructureUseCaseLive => Boolean(entry));

  const prompts = (node.promptKeys ?? [])
    .map((key) => promptByKey.get(key))
    .filter((entry): entry is AiStructurePromptLive => Boolean(entry));

  const liveStatuses = [
    ...useCases.map((entry) => entry.status),
    ...prompts.map((entry) => entry.status),
  ];

  const liveDetailParts: string[] = [];
  for (const useCase of useCases) {
    liveDetailParts.push(
      `${useCase.label}: ${useCase.provider}${useCase.model ? ` / ${useCase.model}` : ""}${
        useCase.credentialConfigured ? " · ключ OK" : " · нет ключа"
      }`,
    );
  }
  for (const prompt of prompts) {
    liveDetailParts.push(
      `${prompt.label}: ${
        prompt.activeVersion
          ? `v${prompt.activeVersion} · ${prompt.usageCount} uses`
          : "нет активной версии"
      }`,
    );
  }

  return {
    ...node,
    useCases,
    prompts,
    liveStatus:
      liveStatuses.length > 0 ? aggregateStatus(liveStatuses) : "static",
    liveDetail:
      liveDetailParts.length > 0 ? liveDetailParts.join("\n") : undefined,
  };
}

function buildArchitectureFlow(
  useCaseById: Map<string, AiStructureUseCaseLive>,
  promptByKey: Map<PlatformPromptKey, AiStructurePromptLive>,
): AiStructureFlow {
  const baseNodes: AiStructureFlowNode[] = [
    {
      id: "inbound",
      label: "Входящее сообщение",
      kind: "trigger",
      summary: "WhatsApp · Telegram · Email · Website Forms",
      steps: [
        "AI включён на канале, агент активен.",
        "Профиль ai_assistant_profile + база знаний + CRM.",
      ],
      useCaseIds: ["channel_messages"],
    },
    {
      id: "queue",
      label: "ai_reply_jobs",
      kind: "process",
      summary: "Очередь автоответов и follow-up.",
      steps: [
        "Сообщение → durable job.",
        "Worker собирает контекст и prompt.",
      ],
      callTypes: ["auto_reply", "follow_up"],
      useCaseIds: ["channel_messages", "follow_up"],
      promptKeys: ["assistant_system", "follow_up"],
    },
    {
      id: "llm",
      label: "LLM генерация",
      kind: "llm",
      summary: "Сценарий + credential + модель из БД.",
      steps: [
        "platform_ai_use_case_config выбирает провайдера.",
        "Ключ из platform_ai_credentials / vault.",
      ],
      callTypes: ["auto_reply", "follow_up"],
      useCaseIds: ["channel_messages", "follow_up"],
      promptKeys: ["assistant_system", "follow_up"],
      limits: "Считается в лимит AI-ответов тарифа.",
    },
    {
      id: "guard",
      label: "Sanitize + fallback",
      kind: "guard",
      summary: "Блокировка утечек и безопасный ответ.",
      steps: [
        "sanitizeCustomerFacingReply.",
        "При блокировке — guard_fallback из Prompt CMS.",
      ],
      promptKeys: ["guard_fallback"],
      useCaseIds: ["channel_messages"],
    },
    {
      id: "delivery",
      label: "Доставка клиенту",
      kind: "delivery",
      summary: "Канал бизнеса получает готовый текст.",
      steps: ["WhatsApp / Telegram / Email delivery log."],
    },
    {
      id: "orchestrator",
      label: "CRM Orchestrator",
      kind: "background",
      summary: "Фон: сделки, задачи, календарь.",
      steps: [
        "ai_orchestration_jobs.",
        "Промпты orchestrator + executor.",
      ],
      callTypes: ["orchestrator", "crm_plan"],
      useCaseIds: ["orchestrator"],
      promptKeys: ["orchestrator", "executor"],
      limits: "Не в лимите ответов клиенту.",
    },
  ];

  const nodes = baseNodes.map((node) =>
    enrichArchitectureNode(node, useCaseById, promptByKey),
  );

  return {
    id: "reply-flow",
    title: "Ответ клиенту",
    description:
      "Реальная цепочка автономии: канал → очередь → LLM → guard → доставка → CRM.",
    nodes,
    edges: [
      { id: "e1", source: "inbound", target: "queue" },
      { id: "e2", source: "queue", target: "llm" },
      { id: "e3", source: "llm", target: "guard" },
      { id: "e4", source: "guard", target: "delivery" },
      { id: "e5", source: "delivery", target: "orchestrator", label: "фон" },
    ],
  };
}

function buildCategoryUseCaseFlow(
  categoryId: "messaging" | "voice" | "background",
  cards: AiUseCaseCardView[],
  useCaseById: Map<string, AiStructureUseCaseLive>,
  promptByKey: Map<PlatformPromptKey, AiStructurePromptLive>,
): AiStructureFlow {
  const category = PLATFORM_AI_USE_CASE_CATEGORIES.find(
    (entry) => entry.id === categoryId,
  )!;
  const categoryCards = cards.filter(
    (card) => card.definition.category === categoryId,
  );

  const rootId = `${categoryId}-root`;
  const nodes: AiStructureFlowNode[] = [
    {
      id: rootId,
      label: category.label,
      kind: "trigger",
      summary: `${categoryCards.length} сценариев платформы`,
      steps: categoryCards.map((card) => card.definition.label),
      liveStatus: aggregateStatus(
        categoryCards.map(
          (card) => useCaseById.get(card.definition.id)?.status ?? "missing",
        ),
      ),
    },
  ];

  const edges: AiStructureFlow["edges"] = [];

  categoryCards.forEach((card, index) => {
    const live = useCaseById.get(card.definition.id)!;
    const useCaseNodeId = `uc-${card.definition.id}`;
    const relatedPrompts = PLATFORM_PROMPT_KEYS.filter((key) =>
      PROMPT_CONSUMERS[key].useCaseIds.includes(card.definition.id),
    )
      .map((key) => promptByKey.get(key))
      .filter((entry): entry is AiStructurePromptLive => Boolean(entry));

    nodes.push({
      id: useCaseNodeId,
      label: card.definition.label,
      kind: "usecase",
      summary: card.definition.description,
      steps: [
        `Provider: ${live.provider}`,
        `Model: ${live.model ?? "—"}`,
        `Credential: ${live.credentialName ?? "не назначен"}`,
        live.credentialConfigured ? "Ключ настроен" : "Ключ отсутствует",
        `Config row: ${live.hasConfigRow ? "есть" : "дефолт каталога"}`,
      ],
      callTypes: [...card.definition.callTypes],
      useCaseIds: [card.definition.id],
      useCases: [live],
      prompts: relatedPrompts,
      promptKeys: relatedPrompts.map((entry) => entry.promptKey),
      liveStatus: aggregateStatus([
        live.status,
        ...relatedPrompts.map((entry) => entry.status),
      ]),
      liveDetail: `${live.provider}${live.model ? ` / ${live.model}` : ""}`,
    });

    edges.push({
      id: `e-${rootId}-${useCaseNodeId}`,
      source: rootId,
      target: useCaseNodeId,
    });

    const credNodeId = `cred-${card.definition.id}`;
    nodes.push({
      id: credNodeId,
      label: live.credentialName ?? "Credential",
      kind: "credential",
      summary: live.credentialConfigured
        ? "Секрет в vault активен"
        : "Нужен ключ в General API AI",
      steps: [
        `Provider: ${live.provider}`,
        live.credentialConfigured ? "configured = true" : "configured = false",
      ],
      useCaseIds: [card.definition.id],
      useCases: [live],
      liveStatus: live.status,
      liveDetail: live.credentialName ?? live.provider,
    });

    edges.push({
      id: `e-${useCaseNodeId}-${credNodeId}`,
      source: useCaseNodeId,
      target: credNodeId,
      label: "ключ",
    });

    relatedPrompts.forEach((prompt, promptIndex) => {
      const promptNodeId = `prompt-${card.definition.id}-${prompt.promptKey}`;
      nodes.push({
        id: promptNodeId,
        label: prompt.label,
        kind: "prompt",
        summary: PROMPT_CONSUMERS[prompt.promptKey].nodeHint,
        steps: [
          prompt.activeVersion
            ? `Активна версия v${prompt.activeVersion}`
            : "Нет активной версии",
          `Использований: ${prompt.usageCount}`,
        ],
        promptKeys: [prompt.promptKey],
        prompts: [prompt],
        useCaseIds: [card.definition.id],
        liveStatus: prompt.status,
        liveDetail: prompt.activeVersion
          ? `v${prompt.activeVersion}`
          : "missing",
      });

      edges.push({
        id: `e-${useCaseNodeId}-${promptNodeId}-${promptIndex}`,
        source: useCaseNodeId,
        target: promptNodeId,
        label: "prompt",
      });
    });

    // Keep index used for stable layout hint in description
    void index;
  });

  return {
    id: `usecases-${categoryId}`,
    title: category.label,
    description: `Все дороги категории «${category.label}»: сценарий → credential → Prompt CMS.`,
    nodes,
    edges,
  };
}

function buildPromptCmsFlow(
  promptByKey: Map<PlatformPromptKey, AiStructurePromptLive>,
  useCaseById: Map<string, AiStructureUseCaseLive>,
): AiStructureFlow {
  const rootId = "prompt-cms-root";
  const nodes: AiStructureFlowNode[] = [
    {
      id: rootId,
      label: "Prompt CMS",
      kind: "prompt",
      summary: "Активные промпты платформы из platform_prompts",
      steps: PLATFORM_PROMPT_KEYS.map((key) => PLATFORM_PROMPT_LABELS[key]),
      liveStatus: aggregateStatus(
        PLATFORM_PROMPT_KEYS.map(
          (key) => promptByKey.get(key)?.status ?? "missing",
        ),
      ),
    },
  ];
  const edges: AiStructureFlow["edges"] = [];

  for (const key of PLATFORM_PROMPT_KEYS) {
    const prompt = promptByKey.get(key)!;
    const promptNodeId = `cms-${key}`;
    const consumers = PROMPT_CONSUMERS[key].useCaseIds
      .map((id) => useCaseById.get(id))
      .filter((entry): entry is AiStructureUseCaseLive => Boolean(entry));

    nodes.push({
      id: promptNodeId,
      label: prompt.label,
      kind: "prompt",
      summary: PROMPT_CONSUMERS[key].nodeHint,
      steps: [
        prompt.activeVersion
          ? `Активна v${prompt.activeVersion}`
          : "Нет активной версии",
        `Usage: ${prompt.usageCount}`,
        `Потребители: ${PROMPT_CONSUMERS[key].useCaseIds.join(", ")}`,
      ],
      promptKeys: [key],
      prompts: [prompt],
      useCaseIds: PROMPT_CONSUMERS[key].useCaseIds,
      useCases: consumers,
      liveStatus: prompt.status,
      liveDetail: prompt.activeVersion
        ? `v${prompt.activeVersion} · ${prompt.usageCount} uses`
        : "missing",
    });

    edges.push({
      id: `e-${rootId}-${promptNodeId}`,
      source: rootId,
      target: promptNodeId,
    });

    for (const consumer of consumers) {
      const consumerNodeId = `cms-uc-${key}-${consumer.useCaseId}`;
      nodes.push({
        id: consumerNodeId,
        label: consumer.label,
        kind: "usecase",
        summary: `${consumer.provider}${consumer.model ? ` / ${consumer.model}` : ""}`,
        steps: [
          consumer.credentialConfigured
            ? `Ключ: ${consumer.credentialName ?? "OK"}`
            : "Ключ не настроен",
        ],
        useCaseIds: [consumer.useCaseId],
        useCases: [consumer],
        promptKeys: [key],
        liveStatus: consumer.status,
        liveDetail: consumer.provider,
      });
      edges.push({
        id: `e-${promptNodeId}-${consumerNodeId}`,
        source: promptNodeId,
        target: consumerNodeId,
        label: "использует",
      });
    }
  }

  return {
    id: "prompt-cms",
    title: "Prompt CMS",
    description:
      "Связь промптов с реальными сценариями. Редактирование — во вкладке Prompt CMS.",
    nodes,
    edges,
  };
}

export function buildLiveAiStructure(input: {
  useCaseCards: AiUseCaseCardView[];
  credentials: AiCredentialView[];
  promptGroups: PlatformPromptGroup[];
}): AiStructureLiveData {
  const useCases = attachCredentialNames(
    input.useCaseCards.map(mapUseCaseLive),
    input.useCaseCards,
    input.credentials,
  );
  const useCaseById = new Map(
    useCases.map((entry) => [entry.useCaseId, entry]),
  );

  const prompts = PLATFORM_PROMPT_KEYS.map((key) => {
    const group = input.promptGroups.find((entry) => entry.promptKey === key);
    if (group) {
      return mapPromptLive(group);
    }
    return {
      promptKey: key,
      label: PLATFORM_PROMPT_LABELS[key],
      activeVersion: null,
      usageCount: 0,
      status: "missing" as const,
    };
  });
  const promptByKey = new Map(prompts.map((entry) => [entry.promptKey, entry]));

  const flows = [
    buildArchitectureFlow(useCaseById, promptByKey),
    buildCategoryUseCaseFlow(
      "messaging",
      input.useCaseCards,
      useCaseById,
      promptByKey,
    ),
    buildCategoryUseCaseFlow(
      "voice",
      input.useCaseCards,
      useCaseById,
      promptByKey,
    ),
    buildCategoryUseCaseFlow(
      "background",
      input.useCaseCards,
      useCaseById,
      promptByKey,
    ),
    buildPromptCmsFlow(promptByKey, useCaseById),
  ];

  return {
    flows,
    summary: {
      useCasesReady: useCases.filter((entry) => entry.status === "ready")
        .length,
      useCasesTotal: PLATFORM_AI_USE_CASES.length,
      credentialsReady: input.credentials.filter(
        (entry) => entry.isActive && entry.configured,
      ).length,
      credentialsTotal: input.credentials.length,
      promptsReady: prompts.filter((entry) => entry.status === "ready").length,
      promptsTotal: PLATFORM_PROMPT_KEYS.length,
    },
  };
}
