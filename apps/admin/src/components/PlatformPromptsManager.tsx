"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CheckIcon,
  Loader2Icon,
  Maximize2Icon,
  Minimize2Icon,
  RotateCcwIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import {
  activatePlatformPromptVersionAction,
  deletePlatformPromptVersionAction,
  resetPlatformPromptToDefaultAction,
  savePlatformPromptAction,
} from "@/features/platform-prompts/actions";
import type {
  PlatformPromptGroup,
  PlatformPromptRecord,
} from "@/features/platform-prompts/types";
import type { PlatformPromptKey } from "@orzu/platform-ai";
import { cn } from "@/lib/utils";

type PlatformPromptsManagerProps = {
  initialGroups: PlatformPromptGroup[];
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildDiffPreview(active: string | null, draft: string): string | null {
  if (!active || active === draft) {
    return null;
  }

  const activeLines = active.split("\n");
  const draftLines = draft.split("\n");
  const max = Math.max(activeLines.length, draftLines.length);
  const changes: string[] = [];

  for (let index = 0; index < max; index += 1) {
    const left = activeLines[index] ?? "";
    const right = draftLines[index] ?? "";

    if (left !== right) {
      changes.push(`- ${left}`);
      changes.push(`+ ${right}`);
    }
  }

  return changes.slice(0, 24).join("\n");
}

export function PlatformPromptsManager({
  initialGroups,
}: PlatformPromptsManagerProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [selectedKey, setSelectedKey] = useState<PlatformPromptKey>(
    initialGroups[0]?.promptKey ?? "assistant_system",
  );
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    initialGroups[0]?.activeVersion?.id ?? initialGroups[0]?.versions[0]?.id ?? null,
  );
  const [editorContent, setEditorContent] = useState(
    initialGroups[0]?.activeVersion?.content ??
      initialGroups[0]?.versions[0]?.content ??
      "",
  );
  const [changeNote, setChangeNote] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedGroup = useMemo(
    () => groups.find((group) => group.promptKey === selectedKey) ?? null,
    [groups, selectedKey],
  );

  const selectedVersion = useMemo(
    () =>
      selectedGroup?.versions.find((version) => version.id === selectedVersionId) ??
      null,
    [selectedGroup, selectedVersionId],
  );

  const diffPreview = buildDiffPreview(
    selectedGroup?.activeVersion?.content ?? null,
    editorContent,
  );

  const selectGroup = (group: PlatformPromptGroup) => {
    setSelectedKey(group.promptKey);
    const version = group.activeVersion ?? group.versions[0] ?? null;
    setSelectedVersionId(version?.id ?? null);
    setEditorContent(version?.content ?? "");
    setChangeNote("");
  };

  const selectVersion = (version: PlatformPromptRecord) => {
    setSelectedVersionId(version.id);
    setEditorContent(version.content);
  };

  const refreshGroup = (record: PlatformPromptRecord) => {
    setGroups((current) =>
      current.map((group) => {
        if (group.promptKey !== record.promptKey) {
          return group;
        }

        const versions = [
          record,
          ...group.versions.filter((entry) => entry.id !== record.id),
        ].sort((left, right) => right.version - left.version);

        return {
          ...group,
          activeVersion: record.isActive ? record : group.activeVersion,
          versions: versions.map((entry) => ({
            ...entry,
            isActive: entry.id === record.id ? record.isActive : entry.isActive,
          })),
        };
      }),
    );
    setSelectedVersionId(record.id);
    setEditorContent(record.content);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-2">
        {groups.map((group) => (
          <button
            key={group.promptKey}
            type="button"
            onClick={() => selectGroup(group)}
            className={cn(
              "w-full rounded-xl border px-3 py-3 text-left transition-colors",
              selectedKey === group.promptKey
                ? "border-primary bg-primary/5"
                : "hover:bg-muted/50",
            )}
          >
            <p className="text-sm font-medium">{group.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              v{group.activeVersion?.version ?? "—"} ·{" "}
              {group.activeVersion?.usageCount ?? 0} uses
            </p>
          </button>
        ))}
        <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
          Business-specific instructions stay in each tenant&apos;s AI Agent
          settings (`systemPrompt`). Platform prompts control shared worker
          behavior layers.
        </p>
      </aside>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{selectedGroup?.label}</h2>
            <p className="text-sm text-muted-foreground">
              Active v{selectedGroup?.activeVersion?.version ?? "—"} · last used{" "}
              {formatDate(selectedGroup?.activeVersion?.lastUsedAt ?? null)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              onClick={() => setFullscreen((value) => !value)}
            >
              {fullscreen ? (
                <Minimize2Icon className="size-4" />
              ) : (
                <Maximize2Icon className="size-4" />
              )}
              {fullscreen ? "Exit fullscreen" : "Fullscreen"}
            </button>
            <button
              type="button"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              onClick={() =>
                startTransition(async () => {
                  const result = await resetPlatformPromptToDefaultAction({
                    promptKey: selectedKey,
                  });

                  if (!result.success) {
                    toast.error(result.message ?? "Reset failed.");
                    return;
                  }

                  toast.success("Reset to default and saved as new version.");
                  window.location.reload();
                })
              }
            >
              <RotateCcwIcon className="size-4" />
              Reset default
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Versions
            </p>
            {selectedGroup?.versions.map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => selectVersion(version)}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left text-sm",
                  selectedVersionId === version.id && "border-primary bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>v{version.version}</span>
                  {version.isActive ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <CheckIcon className="size-3" />
                      active
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {version.usageCount} uses · {formatDate(version.updatedAt)}
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <textarea
              value={editorContent}
              onChange={(event) => setEditorContent(event.target.value)}
              className={cn(
                "w-full rounded-xl border bg-background p-4 font-mono text-sm leading-6",
                fullscreen ? "min-h-[70vh]" : "min-h-[360px]",
              )}
            />
            <input
              value={changeNote}
              onChange={(event) => setChangeNote(event.target.value)}
              placeholder="Change note for the new version"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
            {diffPreview ? (
              <pre className="overflow-x-auto rounded-xl border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                {diffPreview}
              </pre>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending || !editorContent.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
                onClick={() =>
                  startTransition(async () => {
                    const result = await savePlatformPromptAction({
                      promptKey: selectedKey,
                      content: editorContent,
                      changeNote,
                      activate: true,
                    });

                    if (!result.success || !result.record) {
                      toast.error(result.message ?? "Save failed.");
                      return;
                    }

                    refreshGroup(result.record);
                    setChangeNote("");
                    toast.success(`Saved v${result.record.version} and activated.`);
                  })
                }
              >
                {isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <SaveIcon className="size-4" />
                )}
                Save & activate
              </button>
              {selectedVersion && !selectedVersion.isActive ? (
                <button
                  type="button"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm"
                  onClick={() =>
                    startTransition(async () => {
                      const result = await activatePlatformPromptVersionAction({
                        id: selectedVersion.id,
                      });

                      if (!result.success) {
                        toast.error(result.message ?? "Activation failed.");
                        return;
                      }

                      toast.success("Version activated.");
                      window.location.reload();
                    })
                  }
                >
                  Activate selected
                </button>
              ) : null}
              {selectedVersion && !selectedVersion.isActive ? (
                <button
                  type="button"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm text-destructive"
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deletePlatformPromptVersionAction({
                        id: selectedVersion.id,
                      });

                      if (!result.success) {
                        toast.error(result.message ?? "Delete failed.");
                        return;
                      }

                      toast.success("Version deleted.");
                      window.location.reload();
                    })
                  }
                >
                  <Trash2Icon className="size-4" />
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
