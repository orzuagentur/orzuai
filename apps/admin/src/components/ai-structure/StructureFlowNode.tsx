"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { cn } from "@/lib/utils";
import type {
  AiStructureLiveStatus,
  AiStructureNodeKind,
} from "@/features/ai-management/types";

export type StructureCanvasNodeData = {
  label: string;
  kind: AiStructureNodeKind;
  summary: string;
  liveStatus?: AiStructureLiveStatus;
  liveDetail?: string;
};

const KIND_STYLES: Record<
  AiStructureNodeKind,
  { ring: string; badge: string; label: string }
> = {
  trigger: {
    ring: "border-emerald-500/50 bg-emerald-500/5",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    label: "Старт",
  },
  process: {
    ring: "border-sky-500/50 bg-sky-500/5",
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    label: "Процесс",
  },
  llm: {
    ring: "border-violet-500/50 bg-violet-500/5",
    badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    label: "LLM",
  },
  guard: {
    ring: "border-amber-500/50 bg-amber-500/5",
    badge: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    label: "Guard",
  },
  delivery: {
    ring: "border-blue-500/50 bg-blue-500/5",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    label: "Доставка",
  },
  background: {
    ring: "border-zinc-500/50 bg-zinc-500/5",
    badge: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
    label: "Фон",
  },
  voice: {
    ring: "border-rose-500/50 bg-rose-500/5",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    label: "Voice",
  },
  usecase: {
    ring: "border-indigo-500/50 bg-indigo-500/5",
    badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    label: "Сценарий",
  },
  prompt: {
    ring: "border-fuchsia-500/50 bg-fuchsia-500/5",
    badge: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
    label: "Prompt",
  },
  credential: {
    ring: "border-teal-500/50 bg-teal-500/5",
    badge: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
    label: "Ключ",
  },
};

const STATUS_DOT: Record<AiStructureLiveStatus, string> = {
  ready: "bg-emerald-500",
  partial: "bg-amber-500",
  missing: "bg-rose-500",
  static: "bg-muted-foreground/40",
};

function StructureFlowNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as StructureCanvasNodeData;
  const style = KIND_STYLES[nodeData.kind] ?? KIND_STYLES.process;
  const status = nodeData.liveStatus ?? "static";

  return (
    <div
      className={cn(
        "min-w-[210px] max-w-[250px] rounded-xl border-2 bg-card px-3 py-2.5 shadow-sm transition-shadow",
        style.ring,
        status === "missing" ? "opacity-90" : "",
        selected ? "shadow-md ring-2 ring-primary/40" : "",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2.5 !border-2 !border-background !bg-muted-foreground"
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[status])}
            title={status}
          />
          <p className="text-sm font-semibold leading-snug text-foreground">
            {nodeData.label}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            style.badge,
          )}
        >
          {style.label}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {nodeData.liveDetail || nodeData.summary}
      </p>
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2.5 !border-2 !border-background !bg-muted-foreground"
      />
    </div>
  );
}

export const StructureFlowNode = memo(StructureFlowNodeComponent);
