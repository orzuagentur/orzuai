"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  DEFAULT_PLATFORM_PROMPTS,
  PLATFORM_PROMPT_KEYS,
  PLATFORM_PROMPT_LABELS,
  isPlatformPromptKey,
  type PlatformPromptKey,
} from "@orzu/platform-ai";
import type {
  PlatformPromptGroup,
  PlatformPromptRecord,
  SavePlatformPromptInput,
} from "@/features/platform-prompts/types";
import {
  createServiceRoleClient,
  requirePlatformAdmin,
} from "@/lib/supabase/server";

const savePromptSchema = z.object({
  promptKey: z.enum(PLATFORM_PROMPT_KEYS),
  content: z.string().trim().min(1).max(50_000),
  changeNote: z.string().trim().max(300).optional(),
  activate: z.boolean().optional(),
});

const activateSchema = z.object({
  id: z.string().uuid(),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

type PromptRow = {
  id: string;
  prompt_key: string;
  version: number;
  content: string;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  change_note: string;
  created_at: string;
  updated_at: string;
};

function mapRow(row: PromptRow): PlatformPromptRecord {
  return {
    id: row.id,
    promptKey: row.prompt_key as PlatformPromptKey,
    version: row.version,
    content: row.content,
    isActive: row.is_active,
    usageCount: row.usage_count,
    lastUsedAt: row.last_used_at,
    changeNote: row.change_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function seedPlatformPromptsIfEmpty(): Promise<void> {
  const service = createServiceRoleClient();
  const { count } = await service
    .from("platform_prompts")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) > 0) {
    return;
  }

  await service.from("platform_prompts").insert(
    PLATFORM_PROMPT_KEYS.map((promptKey, index) => ({
      prompt_key: promptKey,
      version: 1,
      content: DEFAULT_PLATFORM_PROMPTS[promptKey],
      is_active: true,
      change_note: index === 0 ? "Initial seed" : "Initial seed",
    })),
  );
}

function groupPromptRows(rows: PlatformPromptRecord[]): PlatformPromptGroup[] {
  const byKey = new Map<PlatformPromptKey, PlatformPromptRecord[]>();

  for (const row of rows) {
    const list = byKey.get(row.promptKey) ?? [];
    list.push(row);
    byKey.set(row.promptKey, list);
  }

  return PLATFORM_PROMPT_KEYS.map((promptKey) => {
    const versions = (byKey.get(promptKey) ?? []).sort(
      (left, right) => right.version - left.version,
    );

    return {
      promptKey,
      label: PLATFORM_PROMPT_LABELS[promptKey],
      activeVersion: versions.find((entry) => entry.isActive) ?? null,
      versions,
    };
  });
}

function revalidatePromptPaths(): void {
  revalidatePath("/ai-management/prompts");
  revalidatePath("/ai-management/structure");
}

export async function fetchPlatformPromptsAction(): Promise<{
  groups: PlatformPromptGroup[];
}> {
  await requirePlatformAdmin();
  await seedPlatformPromptsIfEmpty();

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("platform_prompts")
    .select(
      "id, prompt_key, version, content, is_active, usage_count, last_used_at, change_note, created_at, updated_at",
    )
    .order("prompt_key", { ascending: true })
    .order("version", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return {
    groups: groupPromptRows((data ?? []).map(mapRow)),
  };
}

export async function savePlatformPromptAction(
  input: SavePlatformPromptInput,
): Promise<{ success: boolean; message?: string; record?: PlatformPromptRecord }> {
  await requirePlatformAdmin();

  const parsed = savePromptSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid prompt payload.",
    };
  }

  const service = createServiceRoleClient();
  const { data: latest } = await service
    .from("platform_prompts")
    .select("version")
    .eq("prompt_key", parsed.data.promptKey)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version ?? 0) + 1;
  const shouldActivate = parsed.data.activate !== false;

  if (shouldActivate) {
    await service
      .from("platform_prompts")
      .update({ is_active: false })
      .eq("prompt_key", parsed.data.promptKey)
      .eq("is_active", true);
  }

  const { data, error } = await service
    .from("platform_prompts")
    .insert({
      prompt_key: parsed.data.promptKey,
      version: nextVersion,
      content: parsed.data.content,
      is_active: shouldActivate,
      change_note: parsed.data.changeNote?.trim() || `Version ${nextVersion}`,
    })
    .select(
      "id, prompt_key, version, content, is_active, usage_count, last_used_at, change_note, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    return { success: false, message: error?.message ?? "Failed to save prompt." };
  }

  revalidatePromptPaths();
  return { success: true, record: mapRow(data as PromptRow) };
}

export async function activatePlatformPromptVersionAction(input: {
  id: string;
}): Promise<{ success: boolean; message?: string }> {
  await requirePlatformAdmin();

  const parsed = activateSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: "Invalid prompt version." };
  }

  const service = createServiceRoleClient();
  const { data: row } = await service
    .from("platform_prompts")
    .select("prompt_key")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!row?.prompt_key || !isPlatformPromptKey(row.prompt_key)) {
    return { success: false, message: "Prompt version not found." };
  }

  await service
    .from("platform_prompts")
    .update({ is_active: false })
    .eq("prompt_key", row.prompt_key)
    .eq("is_active", true);

  const { error } = await service
    .from("platform_prompts")
    .update({ is_active: true })
    .eq("id", parsed.data.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePromptPaths();
  return { success: true };
}

export async function deletePlatformPromptVersionAction(input: {
  id: string;
}): Promise<{ success: boolean; message?: string }> {
  await requirePlatformAdmin();

  const parsed = deleteSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: "Invalid prompt version." };
  }

  const service = createServiceRoleClient();
  const { data: row } = await service
    .from("platform_prompts")
    .select("prompt_key, is_active, version")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!row) {
    return { success: false, message: "Prompt version not found." };
  }

  if (row.is_active) {
    return {
      success: false,
      message: "Activate another version before deleting the active one.",
    };
  }

  const { count } = await service
    .from("platform_prompts")
    .select("id", { count: "exact", head: true })
    .eq("prompt_key", row.prompt_key);

  if ((count ?? 0) <= 1) {
    return { success: false, message: "At least one version must remain." };
  }

  const { error } = await service
    .from("platform_prompts")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePromptPaths();
  return { success: true };
}

export async function resetPlatformPromptToDefaultAction(input: {
  promptKey: PlatformPromptKey;
}): Promise<{ success: boolean; message?: string }> {
  return savePlatformPromptAction({
    promptKey: input.promptKey,
    content: DEFAULT_PLATFORM_PROMPTS[input.promptKey],
    changeNote: "Reset to code default",
    activate: true,
  }).then((result) =>
    result.success
      ? { success: true }
      : { success: false, message: result.message },
  );
}
